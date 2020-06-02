pragma solidity ^0.6.2;

/**
 * @title   Vanilla Option Automated Market Maker
 * @author  Primitive
 */

import "../extensions/PrimePoolV1.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/IPrime.sol";
import "../interfaces/IPrimePool.sol";
import "../interfaces/IPrimeOracle.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "../interfaces/IUniswapV2Router01.sol";

contract PrimeAMM is PrimePoolV1 {
    using SafeMath for uint;

    uint public constant MANTISSA = 10**36;
    uint public constant ONE_ETHER = 1 ether;
    uint public constant DISCOUNT_RATE = 5;
    uint public constant MIN_VOLATILITY = 10**15;
    uint public volatility;

    address public oracle;
    address public WETH;
    address public router;

    event Market(address tokenP);
    event Buy(address indexed from, uint outTokenU, uint premium);
    event Sell(address indexed from, uint inTokenP, uint premium);

    constructor(
        address _weth,
        address _tokenP,
        address _oracle,
        address _factory,
        address _router
    )
        public
        PrimePoolV1(_tokenP, _factory)
    {
        WETH = _weth;
        oracle = _oracle;
        router = _router;
        volatility = 500;
    }

    receive() external payable {}

    /**
     * @dev Accepts deposits of underlying tokens.
     * @param inTokenU Quantity of underlyings to deposit.
     */
    function deposit(uint inTokenU) external whenNotPaused nonReentrant
        returns (uint outTokenPULP, bool success)
    {
        address _tokenP = tokenP;
        address tokenU = IPrime(_tokenP).tokenU();
        (uint totalBalance) = totalPoolBalance(_tokenP);
        (outTokenPULP) = _addLiquidity(_tokenP, msg.sender, inTokenU, totalBalance);
        require(
            IERC20(tokenU).transferFrom(msg.sender, address(this), inTokenU) &&
            inTokenU >= MIN_LIQUIDITY,
            "ERR_BAL_UNDERLYING"
        );
        success = true;
    }

    /**
     * @dev Withdraws underlyings proportional to liquidity tokens burned.
     * @param inTokenPULP Quantity of liquidity tokens to burn.
     */
    function withdraw(uint inTokenPULP) external whenNotPaused nonReentrant returns (bool) {
        // Store for gas savings.
        address _tokenP = tokenP;
        (address tokenU, address tokenS, address tokenR, , ,) = IPrime(_tokenP).prime();
        (uint totalBalance) = totalPoolBalance(_tokenP);
        (uint balanceU,) = balances();

        // Burn liquidity tokens.
        (uint outTokenU) = _removeLiquidity(msg.sender, inTokenPULP, totalBalance);

        // If not enough available liquidity to draw, redeem and swap strike tokens.
        if(balanceU < outTokenU) {
            (uint outTokenR) = _redeemAndSwapStrike(_tokenP, tokenU, tokenS, tokenR);
        }
        require(balanceU >= outTokenU, "ERR_BAL_INSUFFICIENT");
        return IERC20(tokenU).transfer(msg.sender, outTokenU);
    }

    /**
     * @dev Private function to push tokenR to option contract then pull tokenS.
     * @notice Should only be called when Pool cannot fill withdraw request.
     * Will revert if maxDraw is 0.
     * @param _tokenP Address of Prime option contract.
     */
    function _redeemAndSwapStrike(address _tokenP, address tokenU, address tokenS, address tokenR)
        private
        returns (uint outTokenR)
    {
        // Check how many tokenS can be pulled from PrimeOption.sol.
        uint balanceR = IERC20(tokenR).balanceOf(address(this));
        uint cacheS = IPrime(_tokenP).cacheS();
        uint maxDraw = balanceR > cacheS ? cacheS : balanceR;

        // Redeem tokens.
        (outTokenR) = _redeem(address(this), maxDraw);
        assert(outTokenR == maxDraw);

        address[] memory path = new address[](2);
        path[0] = tokenU;
        path[1] = tokenS;
        IUniswapV2Router01(router).swapExactTokensForTokens(
            outTokenR,
            0,
            path,
            address(this),
            now + 3 minutes
        );
    }

    /**
     * @dev Purchase option tokens from the pool.
     * @notice The underlying token is what is purchasable using the strike token.
     * @param outTokenP The quantity of options to buy, which allow the purchase of 1:1 tokenU.
     * @return bool True if the msg.sender receives tokenP.
     */
    function buy(uint outTokenP) external nonReentrant returns (bool) {
        // Store in memory for gas savings.
        address _tokenP = tokenP;
        (
            address tokenU, // Assume DAI.
            address tokenS, // Assume ETH.
             , // Assume tokenR and we don't need it in this function.
            uint base,
            uint price,
            uint expiry
        ) = IPrime(_tokenP).prime();

        // Optimistically mint option tokens to the msg.sender.
        (uint outTokenU) = _write(msg.sender, outTokenP);

        // Calculates and then updates the volatility global state variable.
        volatility = calculateVolatilityProxy(_tokenP);
        
        // Calculate premium. Denominated in tokenU PER tokenS 'covered'.
        (uint premium) = IPrimeOracle(oracle).calculatePremium(
            tokenU,
            tokenS,
            volatility,
            base,
            price,
            expiry
        );
        
        // Calculate total premium to pay. Premium should be in underlying token units.
        premium = outTokenP.mul(premium).div(ONE_ETHER);
        require(premium > 0, "ERR_PREMIUM_ZERO");

        // Pulls payment in tokenU from msg.sender and then pushes tokenP (option).
        // WARNING: Call to untrusted address msg.sender.
        emit Buy(msg.sender, outTokenU, premium);
        return IERC20(tokenU).transferFrom(msg.sender, address(this), premium);
    }

    /**
     * @dev Sell options to the pool.
     * @notice The pool buys options at a discounted rate based on the current premium price.
     * @param inTokenP The amount of Prime option tokens that are being sold.
     */
    function sell(uint inTokenP) external nonReentrant returns (bool) {
        // Store in memory for gas savings.
        address _tokenP = tokenP;
        (
            address tokenU, // Assume DAI.
            address tokenS, // Assume ETH.
            address tokenR, // Assume tokenR.
            uint base,
            uint price,
            uint expiry
        ) = IPrime(_tokenP).prime();

        // Check tokenP balance.
        require(
            IERC20(_tokenP).balanceOf(msg.sender) >= inTokenP &&
            inTokenP > 0,
            "ERR_BAL_PRIME"
        );

        // Calculate the current premium price.
        (uint premium) = IPrimeOracle(oracle).calculatePremium(
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
        uint outTokenR = inTokenP.mul(price).div(base);
        
        // Call the close function to close the option position and receive underlyings.
        (uint outTokenU) = _close(outTokenR, inTokenP);
        assert(inTokenP == outTokenU);

        // Pay out the total premium to the seller.
        emit Sell(msg.sender, inTokenP, premium);
        return IERC20(tokenU).transfer(msg.sender, premium);
    }

    /**
     * @dev Calculates the Pool's Utilization to use as a proxy for volatility.
     * @notice If Pool is not utilized at all, the default volatility is 250.
     */
    function calculateVolatilityProxy(address _tokenP) public view returns (uint _volatility) {
        (uint utilized) = totalUtilized(_tokenP);
        uint totalBalance = totalPoolBalance(_tokenP);
        if(totalBalance > 0) _volatility = utilized.mul(ONE_ETHER).div(totalBalance); // Volatility with 1e18 decimals.
        if(_volatility < MIN_VOLATILITY) {
            _volatility = 1000;
        } else _volatility = _volatility.div(MIN_VOLATILITY).add(1000);

    }

    /**
     * @dev Calculates the amount of utilized tokenU assets outstanding.
     */
    function totalUtilized(address _tokenP) public view returns (uint utilized) {
        // Assume tokenR is proportional to tokenS (WETH) at a 1:1 ratio.
        // TokenR is always minted proportionally to the ratio between tokenU and tokenS (strike price).
        // Assume a ratio of 200 DAI per 1 ETH.
        // If 200 tokenU is used to mint a Prime, it will return 1 tokenR.
        // 1 tokenR * 200 (base) / 1 (price) = 200 tokenU utilized.
        // The returned value for `utilized` should always be greater than 1.
        // TokenR is redeemable to tokenS at a 1:1 ratio (1 tokenR can be redeemed for 1 WETH).
        // The utilized amount of tokenU is therefore this calculation:
        // (tokenR = tokenS = WETH) * Quantity of tokenU (base) / Quantity of tokenS (price).
        ( , , address tokenR, , uint price, ) = IPrime(_tokenP).prime();
        (uint oraclePrice) = marketRatio();
        utilized = IERC20(tokenR).balanceOf(address(this)).mul(oraclePrice).div(price);
    }

    /**
     * @dev Returns the contract balance of tokenU.
     */
    function totalUnutilized(address _tokenP) public view returns (uint balanceU) {
        // The unutilized balance is equal to the balance of tokenU held by the pool.
        balanceU = IERC20(IPrime(_tokenP).tokenU()).balanceOf(address(this));
    }

    /**
     * @dev Returns to total balance of tokenU that the contract has accross accounts.
     * @notice Total Balance = utilized + unutilized. Utilized = underwritten tokenU.
     */
    function totalPoolBalance(address _tokenP) public view returns (uint totalBalance) {
        // Unutilized is the balance of tokenU in the contract. Utilized is outstanding tokenU.
        // Utilized assets are held in the Prime contract waiting to be exercised or expired.
        totalBalance = totalUnutilized(_tokenP).add(totalUtilized(_tokenP));
    }

    /**
     * @dev Utility function to get the market ratio of tokenS denominated in tokenU.
     * @notice Assumes the getUnderlyingPrice function call from the oracle never returns
     * a value greater than 1e36 (MANTISSA).
     */
    function marketRatio() public view returns(uint oraclePrice) {
        oraclePrice = IPrimeOracle(oracle).marketPrice();
    }

    /**
     * @dev Utility function to send ethers safely.
     */
    function sendEther(address to, uint amount) private returns (bool) {
        (bool success, ) = to.call.value(amount)("");
        require(success, "ERR_SEND_ETHER");
        return success;
    }
}

    