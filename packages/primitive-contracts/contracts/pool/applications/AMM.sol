// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

/**
 * @title   Vanilla Option Automated Market Maker
 * @author  Primitive
 */

import { Pool, SafeMath, IERC20 } from "../extensions/Pool.sol";
import { IOption } from "../../option/interfaces/IOption.sol";
import { IWETH } from "../interfaces/IWETH.sol";
import { IPool } from "../interfaces/IPool.sol";
import { IOracle } from "../interfaces/IOracle.sol";
import { IUniswapV2Factory } from "../interfaces/IUniswapV2Factory.sol";
import { IUniswapV2Router01 } from "../interfaces/IUniswapV2Router01.sol";

contract AMM is Pool {
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

    event Market(address optionToken);
    event Buy(address indexed from, uint256 outUnderlyings, uint256 premium);
    event Sell(address indexed from, uint256 inOptions, uint256 premium);

    constructor(
        address _weth,
        address _optionToken,
        address _oracle,
        address _factory,
        address _router
    ) public Pool(_optionToken, _factory) {
        weth = _weth;
        oracle = _oracle;
        router = _router;
        volatility = 500;
        IERC20(IOption(_optionToken).strikeToken()).approve(
            _router,
            100000000 ether
        );
    }

    /**
     * @dev Accepts deposits of underlying tokens.
     * @param inUnderlyings Quantity of underlyings to deposit.
     */
    function deposit(uint256 inUnderlyings)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 outTokenPULP, bool success)
    {
        address _optionToken = optionToken;
        address underlyingToken = IOption(_optionToken).underlyingToken();
        uint256 totalBalance = totalPoolBalance(_optionToken);
        (outTokenPULP) = _addLiquidity(msg.sender, inUnderlyings, totalBalance);
        require(
            IERC20(underlyingToken).transferFrom(
                msg.sender,
                address(this),
                inUnderlyings
            ),
            "ERR_BAL_UNDERLYING"
        );
        success = true;
    }

    /**
     * @dev Withdraws underlyings proportional to liquidity tokens burned.
     * @param inLiquidityTokens Quantity of liquidity tokens to burn.
     */
    function withdraw(uint256 inLiquidityTokens)
        external
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        // Store for gas savings.
        address _optionToken = optionToken;
        (
            address underlyingToken,
            address strikeToken,
            address redeemToken,
            ,
            ,

        ) = IOption(_optionToken).getParameters();
        uint256 totalBalance = totalPoolBalance(_optionToken);
        (uint256 balanceU, ) = balances();

        // Burn liquidity tokens.
        uint256 outUnderlyings = _removeLiquidity(
            msg.sender,
            inLiquidityTokens,
            totalBalance
        );

        // If not enough available liquidity to draw, redeem and swap strike tokens.
        if (balanceU < outUnderlyings) {
            _redeemAndSwapStrike(
                _optionToken,
                underlyingToken,
                strikeToken,
                redeemToken
            );
        }
        require(balanceU >= outUnderlyings, "ERR_BAL_INSUFFICIENT");
        return IERC20(underlyingToken).transfer(msg.sender, outUnderlyings);
    }

    /**
     * @dev Private function to push redeemToken to option contract then pull strikeToken.
     * @notice Should only be called when Pool cannot fill withdraw request.
     * Will revert if maxDraw is 0.
     * @param _optionToken Address of  option contract.
     */
    function _redeemAndSwapStrike(
        address _optionToken,
        address underlyingToken,
        address strikeToken,
        address redeemToken
    ) private returns (uint256 outTokenR) {
        // Check how many strikeToken can be pulled from Option.sol.
        uint256 redeemBalance = IERC20(redeemToken).balanceOf(address(this));
        uint256 strikeCache = IOption(_optionToken).strikeCache();
        uint256 maxDraw = redeemBalance > strikeCache
            ? strikeCache
            : redeemBalance;

        // Redeem tokens.
        (outTokenR) = _redeem(address(this), maxDraw);
        assert(outTokenR == maxDraw);

        uint256 market = IOracle(oracle).marketPrice();
        uint256 minOut = strikeToken == weth
            ? market
            : outTokenR.mul(ONE_ETHER).div(market);

        address[] memory path = new address[](2);
        path[0] = strikeToken;
        path[1] = underlyingToken;
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
     * @param outTokenP The quantity of options to buy, which allow the purchase of 1:1 underlyingToken.
     * @return bool True if the msg.sender receives optionToken.
     */
    function buy(uint256 outTokenP) external nonReentrant returns (bool) {
        // Store in memory for gas savings.
        address _optionToken = optionToken;
        (
            address underlyingToken, // Assume DAI.
            address strikeToken, // Assume ETH. // Assume redeemToken and we don't need it in this function.
            ,
            uint256 base,
            uint256 quote,
            uint256 expiry
        ) = IOption(_optionToken).getParameters();

        // Optimistically mint option tokens to the msg.sender.
        (outTokenP) = _write(outTokenP);

        // Calculates and then updates the volatility global state variable.
        volatility = calculateVolatilityProxy(_optionToken);

        // Calculate premium. Denominated in underlyingToken PER strikeToken 'covered'.
        uint256 premium = IOracle(oracle).calculatePremium(
            underlyingToken,
            strikeToken,
            volatility,
            base,
            quote,
            expiry
        );

        // Calculate total premium to pay. Premium should be in underlying token units.
        premium = outTokenP.mul(premium).div(ONE_ETHER);
        if (underlyingToken == weth) premium = MANTISSA.div(premium);
        require(premium > 0, "ERR_PREMIUM_ZERO");

        // Pulls payment in underlyingToken from msg.sender and then pushes optionToken (option).
        // WARNING: Call to untrusted address msg.sender.
        emit Buy(msg.sender, outTokenP, premium);
        IERC20(underlyingToken).transferFrom(
            msg.sender,
            address(this),
            premium
        );
        return IERC20(_optionToken).transfer(msg.sender, outTokenP);
    }

    /**
     * @dev Sell options to the pool.
     * @notice The pool buys options at a discounted rate based on the current premium quote.
     * @param inOptions The amount of  option tokens that are being sold.
     */
    function sell(uint256 inOptions) external nonReentrant returns (bool) {
        // Store in memory for gas savings.
        address _optionToken = optionToken;
        (
            address underlyingToken, // Assume DAI.
            address strikeToken, // Assume ETH.
            address redeemToken, // Assume redeemToken.
            uint256 base,
            uint256 quote,
            uint256 expiry
        ) = IOption(_optionToken).getParameters();

        // Check optionToken balance.
        require(
            IERC20(_optionToken).balanceOf(msg.sender) >= inOptions &&
                inOptions > 0,
            "ERR_BAL_PRIME"
        );

        // Calculate the current premium quote.
        uint256 premium = IOracle(oracle).calculatePremium(
            underlyingToken,
            strikeToken,
            volatility,
            base,
            quote,
            expiry
        );

        // Calculate discounted premium. This is the value of underlyingToken per strikeToken covered.
        premium = premium.sub(premium.div(DISCOUNT_RATE));

        // Calculate total premium.
        // Units: underlyingToken * (underlyingToken / strikeToken) / 10^18 units = total quantity underlyingToken quote.
        premium = inOptions.mul(premium).div(ONE_ETHER);
        if (underlyingToken == weth) {
            premium = MANTISSA.div(premium);
        }

        // Check to see if pool has the premium to pay out.
        require(
            IERC20(underlyingToken).balanceOf(address(this)) >= premium,
            "ERR_BAL_UNDERLYING"
        );

        // Calculate amount of redeem needed to close position with inUnderlyings.
        uint256 outTokenR = inOptions.mul(quote).div(base);
        require(
            IERC20(redeemToken).balanceOf(address(this)) >= outTokenR,
            "ERR_BAL_REDEEM"
        );

        // Call the close function to close the option position and receive underlyings.
        uint256 outUnderlyings = _close(outTokenR, inOptions);
        assert(inOptions >= outUnderlyings);

        // Pay out the total premium to the seller.
        emit Sell(msg.sender, inOptions, premium);
        return IERC20(underlyingToken).transfer(msg.sender, premium);
    }

    /**
     * @dev Calculates the Pool's Utilization to use as a proxy for volatility.
     * @notice If Pool is not utilized at all, the default volatility is 250.
     */
    function calculateVolatilityProxy(address _optionToken)
        public
        view
        returns (uint256 _volatility)
    {
        uint256 utilized = totalUtilized(_optionToken);
        uint256 totalBalance = totalPoolBalance(_optionToken);
        if (totalBalance > 0)
            _volatility = utilized.mul(ONE_ETHER).div(totalBalance); // Volatility with 1e18 decimals.
        if (_volatility < MIN_VOLATILITY) {
            _volatility = 1000;
        } else _volatility = _volatility.div(MIN_VOLATILITY).add(1000);
    }

    /**
     * @dev Calculates the amount of utilized underlyingToken assets outstanding.
     */
    function totalUtilized(address _optionToken)
        public
        view
        returns (uint256 utilized)
    {
        // Assume redeemToken is proportional to strikeToken (weth) at a 1:1 ratio.
        // TokenR is always minted proportionally to the ratio between underlyingToken and strikeToken (strike quote).
        // Assume a ratio of 200 DAI per 1 ETH.
        // If 200 underlyingToken is used to mint a , it will return 1 redeemToken.
        // 1 redeemToken * 200 (base) / 1 (quote) = 200 underlyingToken utilized.
        // The returned value for `utilized` should always be greater than 1.
        // TokenR is redeemable to strikeToken at a 1:1 ratio (1 redeemToken can be redeemed for 1 weth).
        // The utilized amount of underlyingToken is therefore this calculation:
        // (redeemToken = strikeToken = weth) * Quantity of underlyingToken (base) / Quantity of strikeToken (quote).
        (, , address redeemToken, uint256 base, uint256 quote, ) = IOption(
            _optionToken
        )
            .getParameters();
        utilized = IERC20(redeemToken).balanceOf(address(this)).mul(base).div(
            quote
        );
    }

    /**
     * @dev Returns the contract balance of underlyingToken.
     */
    function totalUnutilized(address _optionToken)
        public
        view
        returns (uint256 balanceU)
    {
        // The unutilized balance is equal to the balance of underlyingToken held by the pool.
        balanceU = IERC20(IOption(_optionToken).underlyingToken()).balanceOf(
            address(this)
        );
    }

    /**
     * @dev Returns to total balance of underlyingToken that the contract has accross accounts.
     * @notice Total Balance = utilized + unutilized. Utilized = underwritten underlyingToken.
     */
    function totalPoolBalance(address _optionToken)
        public
        view
        returns (uint256 totalBalance)
    {
        // Unutilized is the balance of underlyingToken in the contract. Utilized is outstanding underlyingToken.
        // Utilized assets are held in the  contract waiting to be exercised or expired.
        totalBalance = totalUnutilized(_optionToken).add(
            totalUtilized(_optionToken)
        );
    }
}
