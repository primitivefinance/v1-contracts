pragma solidity ^0.6.2;

/**
 * @title   Vanilla Option Exchange
 * @author  Primitive
 */

import "./PrimePoolV1.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IPrime.sol";
import "./interfaces/IPrimePool.sol";
import "./interfaces/IPrimeOracle.sol";

interface UniswapFactoryInterface {
    // Get Exchange and Token Info
    function getExchange(address token) external view returns (address exchange);
}

interface UniswapExchangeInterface {
    // Get Prices
    function getEthToTokenInputPrice(uint256 eth_sold) external view returns (uint256 tokens_bought);
        // Trade ERC20 to ETH
    function tokenToEthSwapInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline) external returns (uint256  eth_bought);
    // Trade ETH to ERC20
    function ethToTokenSwapInput(uint256 min_tokens, uint256 deadline) external payable returns (uint256  tokens_bought);
}

contract PrimeExchange is PrimePoolV1 {
    using SafeMath for uint256;

    address public constant COMPOUND_DAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    uint256 public constant SECONDS_IN_DAY = 86400;
    uint256 public constant ONE_ETHER = 1 ether;
    uint256 public constant MAX_SLIPPAGE = 95;
    uint256 public constant MIN_VOLATILITY = 10**15;
    uint256 public constant MIN_PREMIUM = 100;
    uint256 public constant MIN_LIQUIDITY = 10**4;
    uint256 public constant MANTISSA = 10**36;
    uint256 public constant DISCOUNT_RATE = 5;

    uint256 public volatility;

    // Assume oracle is compound's price proxy oracle.
    address public oracle;
    address public factory;
    address public tokenP;
    address public WETH;

    event Market(address tokenP);
    event Buy(address indexed from, uint256 inTokenS, uint256 outTokenU, uint256 premium);
    event Sell(address indexed from, uint256 inTokenP, uint256 premium);

    constructor(address _weth, address _tokenP, address _oracle, address _factory) 
        public
        PrimePoolV1(_tokenP, _factory)
    {
        WETH = _weth;
        oracle = _oracle;
        volatility = 100;
    }

    receive() external payable {}

    /* =========== TAKER FUNCTIONS =========== */


    /**
     * @dev Purchase ETH Put.
     * @notice An eth put is 200 DAI / 1 ETH. The right to swap 1 ETH (tokenS) for 200 Dai (tokenU).
     * As a user, you want to cover ETH, so you pay in ETH. Every 1 Quantity of ETH covers 200 DAI.
     * A user specifies the amount of ETH they want covered, i.e. the amount of ETH they can swap.
     * @param inTokenS The quantity of tokenS (ETH) to 'cover' with an option. Denominated in tokenS (WETH).
     * @return bool True if the msg.sender receives tokenP.
     */
    function buy(uint256 inTokenS) external nonReentrant returns (bool) {
        // Store in memory for gas savings.
        address _tokenP = tokenP;
        (
            address tokenU, // Assume DAI.
            address tokenS, // Assume ETH.
             , // Assume tokenR and we don't need it in this function.
            uint256 base,
            uint256 price,
            uint256 expiry
        ) = IPrime(_tokenP).prime();

        // Optimistically mint tokenP.

        // outTokenU = inTokenS * Quantity of tokenU (base) / Quantity of tokenS (price).
        // Units = tokenS * tokenU / tokenS = tokenU.
        uint256 outTokenU = inTokenS.mul(base).div(price); 

        // Transfer tokenU (assume DAI) to option contract using Pool funds.
        // We do this because the mint function in the Prime contract will check the balance,
        // against its previously cached balance. The difference is the amount of tokens that were
        // deposited, which determines how many Primes to mint.
        require(IERC20(tokenU).balanceOf(address(this)) >= outTokenU, "ERR_BAL_UNDERLYING");
        (bool transferU) = IERC20(tokenU).transfer(_tokenP, outTokenU);

        // Mint Prime and Prime Redeem to this contract.
        // If outTokenU is zero because the numerator is smaller than the denominator,
        // or because the inTokenS is 0, the mint function will revert. This is because
        // the mint function only works when tokens are sent into the Prime contract.
        (uint256 inTokenP, ) = IPrime(_tokenP).write(address(this));
        
        // Calculate premium. Denominated in tokenU PER tokenS 'covered'.
        (uint256 premium) = IPrimeOracle(oracle).calculatePremium(
            tokenU,
            tokenS,
            volatility,
            base,
            price,
            expiry
        );
        
        // Calculate total premium to pay, total premium = premium per tokenS * inTokenS.
        // Units = tokenS * (tokenU / tokenS) / 10^18 units = tokenU.
        premium = inTokenS.mul(premium).div(ONE_ETHER);
        require(premium > 0, "ERR_PREMIUM_ZERO");

        // Updates the volatility global state variable.
        volatility = calculateVolatilityProxy(_tokenP);

        // Pulls payment in tokenU from msg.sender and then pushes tokenP (option).
        // WARNING: Two calls to untrusted addresses.
        require(IERC20(tokenU).balanceOf(msg.sender) >= premium, "ERR_BAL_UNDERLYING");
        require(IERC20(_tokenP).balanceOf(address(this)) >= inTokenP, "ERR_BAL_PRIME");
        emit Buy(msg.sender, inTokenS, outTokenU, premium);
        (bool received) = IERC20(tokenU).transferFrom(msg.sender, address(this), premium);
        return received && transferU && IERC20(_tokenP).transfer(msg.sender, inTokenP);
    }

    /**
     * @dev Sell Prime options back to the pool.
     * @notice The pool buys options at a discounted rate based on the current premium price.
     * @param inTokenP The amount of Prime option tokens that are being sold.
     */
    function sell(uint256 inTokenP) external nonReentrant returns (bool) {
        // Store in memory for gas savings.
        address _tokenP = tokenP;
        (
            address tokenU, // Assume DAI.
            address tokenS, // Assume ETH.
            address tokenR, // Assume tokenR.
            uint256 base,
            uint256 price,
            uint256 expiry
        ) = IPrime(_tokenP).prime();

        // Check tokenP balance.
        require(
            IERC20(_tokenP).balanceOf(msg.sender) >= inTokenP &&
            inTokenP > 0,
            "ERR_BAL_PRIME"
        );

        // Calculate the current premium price.
        (uint256 premium) = IPrimeOracle(oracle).calculatePremium(
            tokenU,
            tokenS,
            volatility,
            base,
            price,
            expiry
        );

        // Calculate discounted premium. This is the value of tokenU per tokenS covered.
        premium = premium.sub(premium.div(DISCOUNT_RATE));

        // Calculate total premium.
        // Units: tokenU * (tokenU / tokenS) / 10^18 units = total quantity tokenU price.
        premium = inTokenP.mul(premium).div(ONE_ETHER);

        // Check to see if pool has the premium to pay out.
        require(IERC20(tokenU).balanceOf(address(this)) >= premium, "ERR_BAL_UNDERLYING");
        
        // Calculate amount of redeem needed to close position with inTokenU.
        uint256 redeem = inTokenP.mul(price).div(base);

        // Transfer redeem to prime token optimistically.
        IERC20(tokenR).transfer(tokenP, redeem);

        // Transfer prime token to prime contract optimistically.
        require(IERC20(_tokenP).transferFrom(msg.sender, tokenP, inTokenP), "ERR_TRANSFER_IN_PRIME");
        
        // Call the close function to have the transferred prime and redeem tokens burned.
        // Returns tokenU.
        IPrime(_tokenP).close(address(this));

        // Pay out the total premium to the seller.
        emit Sell(msg.sender, inTokenP, premium);
        return IERC20(tokenU).transfer(msg.sender, premium);
    }

    /**
     * @dev Calculates the Pool's Utilization to use as a proxy for volatility.
     * @notice If Pool is not utilized at all, the default volatility is 250.
     */
    function calculateVolatilityProxy(address _tokenP) public view returns (uint256 _volatility) {
        (uint256 utilized) = totalUtilized(_tokenP);
        uint256 totalBalance = totalPoolBalance(_tokenP);
        if(totalBalance > 0) _volatility = utilized.mul(ONE_ETHER).div(totalBalance); // Volatility with 1e18 decimals.
        if(_volatility < MIN_VOLATILITY) {
            _volatility = 1000;
        } else _volatility = _volatility.div(MIN_VOLATILITY).add(1000);

    }

    /**
     * @dev Calculates the amount of utilized tokenU assets outstanding.
     */
    function totalUtilized(address _tokenP) public view returns (uint256 utilized) {
        // Assume tokenR is proportional to tokenS (WETH) at a 1:1 ratio.
        // TokenR is always minted proportionally to the ratio between tokenU and tokenS (strike price).
        // Assume a ratio of 200 DAI per 1 ETH.
        // If 200 tokenU is used to mint a Prime, it will return 1 tokenR.
        // 1 tokenR * 200 (base) / 1 (price) = 200 tokenU utilized.
        // The returned value for `utilized` should always be greater than 1.
        // TokenR is redeemable to tokenS at a 1:1 ratio (1 tokenR can be redeemed for 1 WETH).
        // The utilized amount of tokenU is therefore this calculation:
        // (tokenR = tokenS = WETH) * Quantity of tokenU (base) / Quantity of tokenS (price).
        ( , , address tokenR, , uint256 price, ) = IPrime(_tokenP).prime();
        (uint256 oraclePrice) = marketRatio(_tokenP);
        utilized = IERC20(tokenR).balanceOf(address(this)).mul(oraclePrice).div(price);
    }

    /**
     * @dev Returns the contract balance of tokenU.
     */
    function totalUnutilized(address _tokenP) public view returns (uint256 balanceU) {
        // The unutilized balance is equal to the balance of tokenU held by the pool.
        balanceU = IERC20(IPrime(_tokenP).tokenU()).balanceOf(address(this));
    }

    /**
     * @dev Returns to total balance of tokenU that the contract has accross accounts.
     * @notice Total Balance = utilized + unutilized. Utilized = underwritten tokenU.
     */
    function totalPoolBalance(address _tokenP) public view returns (uint256 totalBalance) {
        // Unutilized is the balance of tokenU in the contract. Utilized is outstanding tokenU.
        // Utilized assets are held in the Prime contract waiting to be exercised or expired.
        totalBalance = totalUnutilized(_tokenP).add(totalUtilized(_tokenP));
    }

    /**
     * @dev Utility function to get the market ratio of tokenS denominated in tokenU.
     * @notice Assumes the getUnderlyingPrice function call from the oracle never returns
     * a value greater than 1e36 (MANTISSA).
     */
    function marketRatio(address _tokenP) public view returns(uint256 oraclePrice) {
        address _tokenU = IPrime(_tokenP).tokenU();
        address token = _tokenU == WETH ? IPrime(_tokenP).tokenS() : _tokenU;
        oraclePrice = MANTISSA.div(IPrimeOracle(oracle).marketPrice(token));
    }

    /**
     * @dev Utility function to send ethers safely.
     */
    function sendEther(address to, uint256 amount) private returns (bool) {
        (bool success, ) = to.call.value(amount)("");
        require(success, "ERR_SEND_ETHER");
        return success;
    }
}

    