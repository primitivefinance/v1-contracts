pragma solidity >=0.6.0;

/**
 * @title   A manager contract for Uniswap markets with Option tokens.
 * @notice  Holds state for related Primitive contracts.
 * @author  Primitive
 */

// Uniswap
import {
    IUniswapV2Router02
} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {
    IUniswapV2Factory
} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
// Primitive
import { IOption } from "../../option/interfaces/IOption.sol";
import { IRegistry } from "../../option/interfaces/IRegistry.sol";
import { ITrader } from "../../option/interfaces/ITrader.sol";
import { TraderLib } from "../../option/libraries/TraderLib.sol";
import { IWethConnector } from "../WETH/IWethConnector.sol";
// Open Zeppelin
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract UniswapConnector is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct UniswapProtocol {
        IUniswapV2Router02 router;
        IUniswapV2Factory factory;
        bool isActivelyTrading;
    }

    struct PrimitiveProtocol {
        ITrader trader;
        IRegistry registry;
        bool isActivelyTrading;
    }

    UniswapProtocol internal _uniswap;
    PrimitiveProtocol internal _primitive;

    address public quoteToken; // the paired token with the option token in the uniswap pair.

    event UpdatedUniswapAddresses(
        address indexed from,
        address indexed newRouter,
        address indexed newFactory,
        bool isActivelyTraded
    );
    event UpdatedPrimitiveAddresses(
        address indexed from,
        address indexed newTrader,
        address indexed newRegistry,
        bool isActivelyTraded
    );

    event DeployedUniswapMarket(address indexed from, address indexed market);
    event AddedLiquidity(
        address indexed from,
        address indexed option,
        uint256 quantityUniTokens
    );
    event UpdatedQuoteToken(
        address indexed from,
        address indexed newQuoteToken
    );
    event UniswapTraderSell(
        address indexed from,
        address indexed to,
        address indexed option,
        uint256 sellQuantity
    );
    event RolledOptions(
        address indexed from,
        address indexed optionFrom,
        address indexed optionTo,
        uint256 quantity
    );
    event RolledOptionLiquidity(
        address indexed from,
        address indexed optionMarketFrom,
        address indexed optionMarketTo,
        uint256 quantity
    );

    // solhint-disable-next-line no-empty-blocks
    constructor() public {}

    // ==== Setup Functions ====

    /**
     * @dev Sets the state for the Uniswap protocol's contracts.
     */
    function setUniswapProtocol(
        address router,
        address factory,
        bool isActivelyTrading
    ) external onlyOwner {
        UniswapProtocol storage uniswap_ = _uniswap;
        uniswap_.router = IUniswapV2Router02(router);
        uniswap_.factory = IUniswapV2Factory(factory);
        uniswap_.isActivelyTrading = isActivelyTrading;
        emit UpdatedUniswapAddresses(
            msg.sender,
            router,
            factory,
            isActivelyTrading
        );
    }

    /**
     * @dev Sets the state for the Primitive protocol's contracts.
     */
    function setPrimitiveProtocol(
        address trader,
        address registry,
        bool isActivelyTrading
    ) external onlyOwner {
        PrimitiveProtocol storage primitive_ = _primitive;
        primitive_.trader = ITrader(trader);
        primitive_.registry = IRegistry(registry);
        primitive_.isActivelyTrading = isActivelyTrading;
        emit UpdatedPrimitiveAddresses(
            msg.sender,
            trader,
            registry,
            isActivelyTrading
        );
    }

    /**
     * @dev The stablecoin "cash" token.
     */
    function setQuoteToken(address _quoteToken) external onlyOwner {
        quoteToken = _quoteToken;
        emit UpdatedQuoteToken(msg.sender, _quoteToken);
    }

    // ==== Trading Functions ====

    /**
     * @dev Mints options using underlyingTokens provided by user, then sells on uniswap.
     */
    function mintAndMarketSell(
        IOption option,
        uint256 sellQuantity,
        uint256 minQuote
    ) external returns (bool) {
        // sends underlyings to option contract and mint options
        (uint256 outputOptions, uint256 outputRedeems) = TraderLib.safeMint(
            option,
            sellQuantity,
            address(this)
        );

        // market sells options on uniswap
        (, bool success) = marketSell(
            msg.sender,
            address(option),
            outputOptions,
            minQuote
        );

        // send redeem to user
        IERC20(option.redeemToken()).safeTransfer(msg.sender, outputRedeems);
        return success;
    }

    /**
     * @dev Market sells option tokens into the uniswap pool for quote "cash" tokens.
     */
    function marketSell(
        address to,
        address option,
        uint256 sellQuantity,
        uint256 minQuote
    ) internal returns (uint256[] memory amounts, bool success) {
        IUniswapV2Router02 router = _uniswap.router;
        address[] memory path = new address[](2);
        path[0] = option;
        path[1] = quoteToken;
        IERC20(option).approve(address(router), uint256(-1));
        (amounts) = router.swapExactTokensForTokens(
            sellQuantity,
            minQuote,
            path,
            to,
            getMaxDeadline()
        );
        emit UniswapTraderSell(msg.sender, to, option, sellQuantity);
        success = true;
    }

    /**
     * @dev Rolls liquidity in an option series to an option series with a further expiry date.
     * @notice Pulls UNI-V2 liquidity shares from msg.sender.
     */
    function rollOptionLiquidity(
        address rollFromOption,
        address rollToOption,
        address receiver,
        uint256 liquidityQuantityFrom
    ) external returns (bool) {
        IUniswapV2Router02 router = _uniswap.router;
        // take liquidity tokens from user
        IERC20(getUniswapMarketForOption(rollFromOption)).safeTransferFrom(
            msg.sender,
            address(this),
            liquidityQuantityFrom
        );
        // redeem liquidity tokens from uniswap market to receive option + quote tokens
        (uint256 amountOptions, ) = router.removeLiquidity(
            rollFromOption,
            quoteToken,
            liquidityQuantityFrom,
            0,
            0,
            address(this),
            getMaxDeadline()
        );
        // calculate amount of redeem tokens needed to close the rollFromOptions
        uint256 quantityRedeemsRequired = amountOptions.mul(
            IOption(rollFromOption).quote().div(IOption(rollFromOption).base())
        );
        // pull the necessary redeem tokens from the user
        IERC20(IOption(rollFromOption).redeemToken()).safeTransferFrom(
            msg.sender,
            address(this),
            quantityRedeemsRequired
        );
        // close the options with shorter expiry using options + redeem tokens, receive underlying tokens
        (, , uint256 outUnderlyings) = _primitive.trader.safeClose(
            IOption(rollFromOption),
            amountOptions,
            address(this)
        );
        // mint options with further expiry using the underlying tokens received from closing the options
        {
            (, uint256 outputRedeems) = _primitive.trader.safeMint(
                IOption(rollToOption),
                outUnderlyings,
                address(this)
            );
            // provide options + quote tokens to the further expiry uniswap market
            router.addLiquidity(
                rollToOption,
                quoteToken,
                amountOptions,
                0,
                0,
                0,
                receiver,
                getMaxDeadline()
            );
            IERC20(IOption(rollToOption).redeemToken()).safeTransfer(
                msg.sender,
                outputRedeems
            );
        }
        // send redeems to msg.sender
        emit RolledOptionLiquidity(
            msg.sender,
            rollFromOption,
            rollToOption,
            amountOptions
        );
        return true;
    }

    /**
     * @dev Closes a shorter dated option and mints a longer dated option.
     * @notice Pulls option and redeem tokens from msg.sender
     */
    function rollOption(
        address rollFromOption,
        address rollToOption,
        address receiver,
        uint256 rollQuantity
    ) external returns (bool) {
        // close the options with shorter expiry using redeemed options + redeem tokens.
        // sends the underlying tokens to this contract
        (, , uint256 outUnderlyings) = TraderLib.safeClose(
            IOption(rollFromOption),
            rollQuantity,
            address(this)
        );
        // mint options with further expiry using the underlying tokens received from closing the options
        // sends minted option and redeem tokens to the "receiver" address
        ITrader trader = _primitive.trader;
        // approve underlying to be sent to the trader
        IERC20(IOption(rollFromOption).underlyingToken()).approve(
            address(trader),
            uint256(-1)
        );
        (uint256 outputOptions, ) = trader.safeMint(
            IOption(rollToOption),
            outUnderlyings,
            receiver
        );
        emit RolledOptions(
            msg.sender,
            rollFromOption,
            rollToOption,
            outputOptions
        );
        return true;
    }

    // ==== Liquidity Functions ====

    /**
     * @dev Adds liquidity to an option<>quote token pair. Takes a deposit in quote tokens.
     * Takes a deposit in underlying tokens, which are used to mint new option tokens to add liquidity with.
     */
    function addLiquidityWithUnderlying(
        address optionAddress,
        uint256 quantityOptions,
        uint256 quantityQuoteTokens,
        uint256 minQuantityOptions,
        uint256 minQuantityQuoteTokens,
        address to
    ) external returns (bool) {
        // gas savings
        IUniswapV2Router02 router = _uniswap.router;
        address quoteToken_ = quoteToken;
        // warning: calls into msg.sender using `safeTransferFrom`
        IERC20(quoteToken_).safeTransferFrom(
            msg.sender,
            address(this),
            quantityQuoteTokens
        );
        // sends underlyings to option contract and mints option tokens.
        // warning: calls into msg.sender using `safeTransferFrom`
        (uint256 outputOptions, uint256 outputRedeems) = TraderLib.safeMint(
            IOption(optionAddress),
            quantityOptions,
            address(this)
        );
        // approves uniswap pair to transferFrom this contract
        IERC20(optionAddress).approve(address(router), uint256(-1));
        IERC20(quoteToken_).approve(address(router), uint256(-1));
        // adds liquidity to uniswap pair and returns liquidity shares to the "to" address
        (, , uint256 liquidity) = _uniswap.router.addLiquidity(
            optionAddress,
            quoteToken,
            outputOptions,
            quantityQuoteTokens,
            minQuantityOptions,
            minQuantityQuoteTokens,
            to,
            getMaxDeadline()
        );

        // send redeem tokens from minted options to user
        IERC20(IOption(optionAddress).redeemToken()).safeTransfer(
            msg.sender,
            outputRedeems
        );
        emit AddedLiquidity(msg.sender, optionAddress, liquidity);
        return true;
    }

    /**
     * @dev Adds liquidity to an option<>quote token pair. Takes a deposit in quote tokens.
     * Takes a deposit in option tokens.
     */
    function addLiquidityWithOptions(
        address optionAddress,
        uint256 quantityOptions,
        uint256 quantityQuoteTokens,
        uint256 minQuantityOptions,
        uint256 minQuantityQuoteTokens,
        address to
    ) external returns (bool) {
        // gas savings
        IUniswapV2Router02 router = _uniswap.router;
        address quoteToken_ = quoteToken;
        // warning: calls into msg.sender using `safeTransferFrom`
        IERC20(quoteToken_).safeTransferFrom(
            msg.sender,
            address(this),
            quantityQuoteTokens
        );
        // warning: calls into msg.sender using `safeTransferFrom`
        IERC20(optionAddress).safeTransferFrom(
            msg.sender,
            address(this),
            quantityOptions
        );
        // approves uniswap pair to transferFrom this contract
        IERC20(optionAddress).approve(address(router), uint256(-1));
        IERC20(quoteToken_).approve(address(router), uint256(-1));
        // adds liquidity to uniswap pair and returns liquidity shares to the "to" address
        (, , uint256 liquidity) = _uniswap.router.addLiquidity(
            optionAddress,
            quoteToken,
            quantityOptions,
            quantityQuoteTokens,
            minQuantityOptions,
            minQuantityQuoteTokens,
            to,
            getMaxDeadline()
        );
        emit AddedLiquidity(msg.sender, optionAddress, liquidity);
        return true;
    }

    // ==== Management Functions ====

    /**
     * @dev Creats a Uniswap pair for option<>quote tokens.
     */
    function deployUniswapMarket(address optionAddress)
        external
        returns (address)
    {
        address uniswapPair = _uniswap.factory.createPair(
            optionAddress,
            quoteToken
        );
        emit DeployedUniswapMarket(msg.sender, optionAddress);
        return uniswapPair;
    }

    // ==== View ====

    /**
     * @dev The maxmium deadline available for each trade.
     */
    function getMaxDeadline() public view returns (uint256 deadline) {
        // solhint-disable-next-line not-rely-on-time
        deadline = now + 15 minutes;
    }

    /**
     * @dev Gets a Uniswap Pair address for an option token and quote token.
     */
    function getUniswapMarketForOption(address optionAddress)
        public
        view
        returns (address)
    {
        address uniswapPair = _uniswap.factory.getPair(
            optionAddress,
            quoteToken
        );
        require(uniswapPair != address(0x0), "ERR_PAIR_DOES_NOT_EXIST");
        return uniswapPair;
    }

    /**
     * @dev Gets a Uniswap Pair address for the corresponding option parameters.
     */
    function getUniswapMarketForSeries(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) public view returns (address) {
        address optionAddress = _primitive.registry.getOption(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        require(optionAddress != address(0x0), "ERR_OPTION_DOES_NOT_EXIST");
        return getUniswapMarketForOption(optionAddress);
    }

    function getUniswapProtocolAddresses()
        external
        view
        returns (
            address router,
            address factory,
            bool isActivelyTrading
        )
    {
        UniswapProtocol memory uniswap_ = _uniswap;
        return (
            address(uniswap_.router),
            address(uniswap_.factory),
            uniswap_.isActivelyTrading
        );
    }

    function getPrimitiveProtocolAddresses()
        external
        view
        returns (
            address trader,
            address registry,
            bool isActivelyTrading
        )
    {
        PrimitiveProtocol memory primitive_ = _primitive;
        return (
            address(primitive_.trader),
            address(primitive_.registry),
            primitive_.isActivelyTrading
        );
    }
}
