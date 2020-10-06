pragma solidity ^0.6.2;

/**
 * @title   Vanilla Option Automated Market Maker
 * @author  Primitive
 */

import "../extensions/PrimePool.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/IPrime.sol";
import "../interfaces/IPrimePool.sol";
import "../interfaces/IPrimeOracle.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "../interfaces/IUniswapV2Router01.sol";

contract PrimeAMM is PrimePool {
    using SafeMath for uint256;

    uint256 public constant MANTISSA = 10**36;
    uint256 public constant SLIPPAGE = 10**10;
    uint256 public constant ONE_ETHER = 1 ether;
    uint256 public constant DISCOUNT_RATE = 5;
    uint256 public constant MIN_VOLATILITY = 10**15;
    uint256 public volatility;

    address public oracle;
    address public weth;
    address public router;

    event Market(address tokenP);
    event Buy(address indexed from, uint256 outTokenU, uint256 premium);
    event Sell(address indexed from, uint256 inTokenP, uint256 premium);

    constructor(
        address _weth,
        address _tokenP,
        address _oracle,
        address _factory,
        address _router
    ) public PrimePool(_tokenP, _factory) {
        weth = _weth;
        oracle = _oracle;
        router = _router;
        volatility = 500;
        IERC20(IPrime(_tokenP).tokenS()).approve(_router, 100000000 ether);
    }

    /**
     * @dev Accepts deposits of underlying tokens.
     * @param inTokenU Quantity of underlyings to deposit.
     */
    function deposit(uint256 inTokenU)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 outTokenPULP, bool success)
    {
        address _tokenP = tokenP;
        address tokenU = IPrime(_tokenP).tokenU();
        uint256 totalBalance = totalPoolBalance(_tokenP);
        (outTokenPULP) = _addLiquidity(msg.sender, inTokenU, totalBalance);
        require(
            IERC20(tokenU).transferFrom(msg.sender, address(this), inTokenU),
            "ERR_BAL_UNDERLYING"
        );
        success = true;
    }

    /**
     * @dev Withdraws underlyings proportional to liquidity tokens burned.
     * @param inTokenPULP Quantity of liquidity tokens to burn.
     */
    function withdraw(uint256 inTokenPULP)
        external
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        // Store for gas savings.
        address _tokenP = tokenP;
        (address tokenU, address tokenS, address tokenR, , , ) = IPrime(_tokenP)
            .prime();
        uint256 totalBalance = totalPoolBalance(_tokenP);
        (uint256 balanceU, ) = balances();

        // Burn liquidity tokens.
        uint256 outTokenU = _removeLiquidity(
            msg.sender,
            inTokenPULP,
            totalBalance
        );

        // If not enough available liquidity to draw, redeem and swap strike tokens.
        if (balanceU < outTokenU) {
            _redeemAndSwapStrike(_tokenP, tokenU, tokenS, tokenR);
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
    function _redeemAndSwapStrike(
        address _tokenP,
        address tokenU,
        address tokenS,
        address tokenR
    ) private returns (uint256 outTokenR) {
        // Check how many tokenS can be pulled from PrimeOption.sol.
        uint256 balanceR = IERC20(tokenR).balanceOf(address(this));
        uint256 cacheS = IPrime(_tokenP).cacheS();
        uint256 maxDraw = balanceR > cacheS ? cacheS : balanceR;

        // Redeem tokens.
        (outTokenR) = _redeem(address(this), maxDraw);
        assert(outTokenR == maxDraw);

        uint256 market = IPrimeOracle(oracle).marketPrice();
        uint256 minOut = tokenS == weth
            ? market
            : outTokenR.mul(ONE_ETHER).div(market);

        address[] memory path = new address[](2);
        path[0] = tokenS;
        path[1] = tokenU;
        IUniswapV2Router01(router).swapExactTokensForTokens(
            outTokenR,
            minOut.sub(minOut.div(SLIPPAGE)),
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
    function buy(uint256 outTokenP) external nonReentrant returns (bool) {
        // Store in memory for gas savings.
        address _tokenP = tokenP;
        (
            address tokenU, // Assume DAI.
            address tokenS, // Assume ETH. // Assume tokenR and we don't need it in this function.
            ,
            uint256 base,
            uint256 price,
            uint256 expiry
        ) = IPrime(_tokenP).prime();

        // Optimistically mint option tokens to the msg.sender.
        (outTokenP) = _write(outTokenP);

        // Calculates and then updates the volatility global state variable.
        volatility = calculateVolatilityProxy(_tokenP);

        // Calculate premium. Denominated in tokenU PER tokenS 'covered'.
        uint256 premium = IPrimeOracle(oracle).calculatePremium(
            tokenU,
            tokenS,
            volatility,
            base,
            price,
            expiry
        );

        // Calculate total premium to pay. Premium should be in underlying token units.
        premium = outTokenP.mul(premium).div(ONE_ETHER);
        if (tokenU == weth) premium = MANTISSA.div(premium);
        require(premium > 0, "ERR_PREMIUM_ZERO");

        // Pulls payment in tokenU from msg.sender and then pushes tokenP (option).
        // WARNING: Call to untrusted address msg.sender.
        emit Buy(msg.sender, outTokenP, premium);
        IERC20(tokenU).transferFrom(msg.sender, address(this), premium);
        return IERC20(_tokenP).transfer(msg.sender, outTokenP);
    }

    /**
     * @dev Sell options to the pool.
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
            IERC20(_tokenP).balanceOf(msg.sender) >= inTokenP && inTokenP > 0,
            "ERR_BAL_PRIME"
        );

        // Calculate the current premium price.
        uint256 premium = IPrimeOracle(oracle).calculatePremium(
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
        if (tokenU == weth) {
            premium = MANTISSA.div(premium);
        }

        // Check to see if pool has the premium to pay out.
        require(
            IERC20(tokenU).balanceOf(address(this)) >= premium,
            "ERR_BAL_UNDERLYING"
        );

        // Calculate amount of redeem needed to close position with inTokenU.
        uint256 outTokenR = inTokenP.mul(price).div(base);
        require(
            IERC20(tokenR).balanceOf(address(this)) >= outTokenR,
            "ERR_BAL_REDEEM"
        );

        // Call the close function to close the option position and receive underlyings.
        uint256 outTokenU = _close(outTokenR, inTokenP);
        assert(inTokenP >= outTokenU);

        // Pay out the total premium to the seller.
        emit Sell(msg.sender, inTokenP, premium);
        return IERC20(tokenU).transfer(msg.sender, premium);
    }

    /**
     * @dev Calculates the Pool's Utilization to use as a proxy for volatility.
     * @notice If Pool is not utilized at all, the default volatility is 250.
     */
    function calculateVolatilityProxy(address _tokenP)
        public
        view
        returns (uint256 _volatility)
    {
        uint256 utilized = totalUtilized(_tokenP);
        uint256 totalBalance = totalPoolBalance(_tokenP);
        if (totalBalance > 0)
            _volatility = utilized.mul(ONE_ETHER).div(totalBalance); // Volatility with 1e18 decimals.
        if (_volatility < MIN_VOLATILITY) {
            _volatility = 1000;
        } else _volatility = _volatility.div(MIN_VOLATILITY).add(1000);
    }

    /**
     * @dev Calculates the amount of utilized tokenU assets outstanding.
     */
    function totalUtilized(address _tokenP)
        public
        view
        returns (uint256 utilized)
    {
        // Assume tokenR is proportional to tokenS (weth) at a 1:1 ratio.
        // TokenR is always minted proportionally to the ratio between tokenU and tokenS (strike price).
        // Assume a ratio of 200 DAI per 1 ETH.
        // If 200 tokenU is used to mint a Prime, it will return 1 tokenR.
        // 1 tokenR * 200 (base) / 1 (price) = 200 tokenU utilized.
        // The returned value for `utilized` should always be greater than 1.
        // TokenR is redeemable to tokenS at a 1:1 ratio (1 tokenR can be redeemed for 1 weth).
        // The utilized amount of tokenU is therefore this calculation:
        // (tokenR = tokenS = weth) * Quantity of tokenU (base) / Quantity of tokenS (price).
        (, , address tokenR, uint256 base, uint256 price, ) = IPrime(_tokenP)
            .prime();
        utilized = IERC20(tokenR).balanceOf(address(this)).mul(base).div(price);
    }

    /**
     * @dev Returns the contract balance of tokenU.
     */
    function totalUnutilized(address _tokenP)
        public
        view
        returns (uint256 balanceU)
    {
        // The unutilized balance is equal to the balance of tokenU held by the pool.
        balanceU = IERC20(IPrime(_tokenP).tokenU()).balanceOf(address(this));
    }

    /**
     * @dev Returns to total balance of tokenU that the contract has accross accounts.
     * @notice Total Balance = utilized + unutilized. Utilized = underwritten tokenU.
     */
    function totalPoolBalance(address _tokenP)
        public
        view
        returns (uint256 totalBalance)
    {
        // Unutilized is the balance of tokenU in the contract. Utilized is outstanding tokenU.
        // Utilized assets are held in the Prime contract waiting to be exercised or expired.
        totalBalance = totalUnutilized(_tokenP).add(totalUtilized(_tokenP));
    }
}

pragma solidity ^0.6.2;

/**
 * @title   Vanilla Option Pool
 * @author  Primitive
 */

import "../interfaces/IPrime.sol";
import "../interfaces/IPrimePool.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PrimePool is IPrimePool, Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    uint256 public constant MIN_LIQUIDITY = 10**4;

    address public override factory;
    address public override tokenP;

    event Deposit(address indexed from, uint256 inTokenU, uint256 outTokenPULP);
    event Withdraw(
        address indexed from,
        uint256 inTokenPULP,
        uint256 outTokenU
    );

    constructor(address _tokenP, address _factory)
        public
        ERC20("Primitive V1 Pool", "PULP")
    {
        tokenP = _tokenP;
        factory = _factory;
    }

    function kill() public override onlyOwner returns (bool) {
        paused() ? _unpause() : _pause();
    }

    /**
     * @dev Private function to mint tokenPULP to depositor.
     */
    function _addLiquidity(
        address to,
        uint256 inTokenU,
        uint256 poolBalance
    ) internal returns (uint256 outTokenPULP) {
        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance.
        uint256 _totalSupply = totalSupply();

        // If liquidity is not intiialized, mint the initial liquidity.
        if (_totalSupply == 0) {
            outTokenPULP = inTokenU;
        } else {
            outTokenPULP = inTokenU.mul(_totalSupply).div(poolBalance);
        }

        require(
            outTokenPULP > uint256(0) && outTokenPULP >= MIN_LIQUIDITY,
            "ERR_ZERO_LIQUIDITY"
        );
        _mint(to, outTokenPULP);
        emit Deposit(to, inTokenU, outTokenPULP);
    }

    function _removeLiquidity(
        address to,
        uint256 inTokenPULP,
        uint256 poolBalance
    ) internal returns (uint256 outTokenU) {
        require(
            balanceOf(to) >= inTokenPULP && inTokenPULP > 0,
            "ERR_BAL_PULP"
        );
        uint256 _totalSupply = totalSupply();

        // Calculate output amounts.
        outTokenU = inTokenPULP.mul(poolBalance).div(_totalSupply);
        require(outTokenU > uint256(0), "ERR_ZERO");
        // Burn tokenPULP.
        _burn(to, inTokenPULP);
        emit Withdraw(to, inTokenPULP, outTokenU);
    }

    function _write(uint256 outTokenU) internal returns (uint256 outTokenP) {
        address _tokenP = tokenP;
        address tokenU = IPrime(_tokenP).tokenU();
        require(
            IERC20(tokenU).balanceOf(address(this)) >= outTokenU,
            "ERR_BAL_UNDERLYING"
        );
        // Transfer underlying tokens to option contract.
        IERC20(tokenU).transfer(_tokenP, outTokenU);

        // Mint Prime and Prime Redeem to the receiver.
        (outTokenP, ) = IPrime(_tokenP).mint(address(this));
    }

    function _exercise(
        address receiver,
        uint256 outTokenS,
        uint256 inTokenP
    ) internal returns (uint256 outTokenU) {
        address _tokenP = tokenP;
        // Transfer strike token to option contract.
        IERC20(IPrime(_tokenP).tokenS()).transfer(_tokenP, outTokenS);

        // Transfer prime token to option contract.
        IERC20(_tokenP).transferFrom(msg.sender, _tokenP, inTokenP);

        // Call the exercise function to receive underlying tokens.
        (, outTokenU) = IPrime(_tokenP).exercise(
            receiver,
            inTokenP,
            new bytes(0)
        );
    }

    function _redeem(address receiver, uint256 outTokenR)
        internal
        returns (uint256 inTokenS)
    {
        address _tokenP = tokenP;
        // Push tokenR to _tokenP so we can call redeem() and pull tokenS.
        IERC20(IPrime(_tokenP).tokenR()).transfer(_tokenP, outTokenR);
        // Call redeem function to pull tokenS.
        inTokenS = IPrime(_tokenP).redeem(receiver);
    }

    function _close(uint256 outTokenR, uint256 inTokenP)
        internal
        returns (uint256 outTokenU)
    {
        address _tokenP = tokenP;
        // Transfer redeem to the option contract.
        IERC20(IPrime(_tokenP).tokenR()).transfer(_tokenP, outTokenR);

        // Transfer prime token to prime contract.
        IERC20(_tokenP).transferFrom(msg.sender, _tokenP, inTokenP);

        // Call the close function to have the receive underlying tokens.
        (, , outTokenU) = IPrime(_tokenP).close(address(this));
    }

    function balances()
        public
        override
        view
        returns (uint256 balanceU, uint256 balanceR)
    {
        (address tokenU, , address tokenR) = IPrime(tokenP).getTokens();
        balanceU = IERC20(tokenU).balanceOf(address(this));
        balanceR = IERC20(tokenR).balanceOf(address(this));
    }
}
