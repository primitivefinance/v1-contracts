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
    event UpdatedQuoteToken(
        address indexed from,
        address indexed newQuoteToken
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
     * @dev Mints options using underlyingTokens provided by user, then swaps on Uniswap V2.
     * Combines Primitive "mintOptions" function with Uniswap V2 Router "swapExactTokensForTokens" function.
     * @notice If the first address in the path is not the optionToken address, the tx will fail.
     * @param optionToken The address of the Oracle-less Primitive option.
     * @param amountIn The quantity of options to mint and then sell.
     * @param amountOutMin The minimum quantity of tokens to receive in exchange for the optionTokens.
     * @param path The token addresses to trade through using their Uniswap V2 pools. Assumes path[0] = option.
     * @param to The address to send the optionToken proceeds and redeem tokens to.
     * @param deadline The timestamp for a trade to fail at if not successful.
     * @return bool Whether the transaction was successful or not.
     */
    function mintOptionsThenSwapToTokens(
        IOption optionToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (bool) {
        // Pulls underlyingTokens from msg.sender, then pushes underlyingTokens to option contract.
        // Mints option and redeem tokens to this contract.
        (uint256 outputOptions, uint256 outputRedeems) = TraderLib.safeMint(
            optionToken,
            amountIn,
            address(this)
        );

        // Swaps option tokens to the token specified at the end of the path, then sends to msg.sender.
        // Reverts if the first address in the path is not the optionToken address.
        (, bool success) = _swapExactOptionsForTokens(
            address(optionToken),
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );
        // Fail early if the swap failed.
        require(success, "ERR_SWAP_FAILED");

        // Send redeemTokens (short options) to the "to" address.
        IERC20(optionToken.redeemToken()).safeTransfer(to, outputRedeems);
        return success;
    }

    /**
     * @dev Calls the "swapExactTokensForTokens" function on the Uniswap V2 Router 02 Contract.
     * @notice Fails early if the address in the beginning of the path is not the optionToken address.
     * @param optionAddress The address of the optionToken to swap from.
     * @param amountIn The quantity of optionTokens to swap with.
     * @param amountOutMin The minimum quantity of tokens to receive in exchange for the optionTokens swapped.
     * @param path The token addresses to trade through using their Uniswap V2 pools. Assumes path[0] = option.
     * @param to The address to send the optionToken proceeds and redeem tokens to.
     * @param deadline The timestamp for a trade to fail at if not successful.
     */
    function _swapExactOptionsForTokens(
        address optionAdress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) internal returns (uint256[] memory amounts, bool success) {
        // Fails early if the token being swapped from is not the optionToken.
        require(path[0] == optionAddress, "ERR_PATH_OPTION_START");

        // Store router in memory for gas savings.
        IUniswapV2Router02 router = _uniswap.router;

        // Approve the uniswap router to be able to transfer options from this contract.
        IERC20(optionAddress).approve(address(router), uint256(-1));

        // Call the Uniswap V2 function to swap optionTokens to quoteTokens.
        (amounts) = router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );
        success = true;
    }

    /**
     * @dev Combines Uniswap V2 Router "removeLiquidity" function with Primitive "closeOptions" function.
     * @notice Pulls UNI-V2 liquidity shares with option<>quote token and redeemToken from msg.sender.
     * Then closes the optionTokens and withdraws underlyingTokens to the "to" address.
     * Sends quoteTokens from the burned UNI-V2 liquidity shares to the "to" address.
     * @param optionAddress The address of the option that will be closed from burned UNI-V2 liquidity shares.
     * @param liquidity The quantity of liquidity tokens to pull from msg.sender and burn.
     * @param amountAMin
     * @param amountBMin
     * @param to The address that receives quoteTokens from burned UNI-V2, and underlyingTokens from closed options.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function removeLiquidityThenCloseOptions(
        address optionAddress,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public nonReentrant returns (uint256, uint256) {
        // Store in memory for gas savings.
        IUniswapV2Router02 router = _uniswap.router;
        address quoteToken_ = quoteToken;

        // Gets the Uniswap V2 Pair address for optionAddress and quoteToken.
        // Transfers the LP tokens for the pair to this contract.
        // Warning: external call to a non-trusted address `msg.sender`.
        IERC20(getUniswapMarketForOption(optionAddress)).safeTransferFrom(
            msg.sender,
            address(this),
            liquidity
        );

        // Remove liquidity from Uniswap V2 pool to receive pool tokens (option + quote tokens).
        (uint256 amountOptions, uint256 amountQuote) = router.removeLiquidity(
            optionAddress,
            quoteToken_,
            liquidity,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        // Calculate equivalent quantity of redeem (short option) tokens to close the option position.
        // Need to cancel base units and have quote units remaining.
        uint256 baseValue = IOption(optionAddress).getBaseValue();
        uint256 quoteValue = IOption(optionAddress).getQuoteValue();
        uint256 requiredRedeems = amountOptions.mul(quoteValue).div(baseValue);

        // Pull the required redeemTokens from msg.sender to this contract.
        IERC20(IOption(optionAddress).redeemToken()).safeTransferFrom(
            msg.sender,
            address(this),
            requiredRedeems
        );

        // Pushes option and redeem tokens to the option contract and calls "closeOption".
        // Receives underlyingTokens and sends them to the "to" address.
        _primitive.trader.safeClose(IOption(optionAddress), amountOptions, to);

        // Send the quoteTokens received from burning liquidity shares to the "to" address.
        IERC20(quoteToken_).safeTransfer(to, amountQuote);

        return (amountOptions, amountQuote);
    }

    /**
     * @dev Combines "removeLiquidityThenCloseOptions" function with "addLiquidityWithUnderlying" fuction.
     * @notice Rolls UNI-V2 liquidity in an option<>quote pair to a different option<>quote pair.
     * @param rollFromOption The optionToken address to close a UNI-V2 position.
     * @param rollToOption The optionToken address to open a UNI-V2 position.
     * @param liquidity The quantity of UNI-V2 shares to roll from the first Uniswap pool.
     * @param amountAMin
     * @param amountBMin
     * @param to The address that receives the UNI-V2 shares that have been rolled.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function rollOptionLiquidity(
        address rollFromOption,
        address rollToOption,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (bool) {
        (
            uint256 outUnderlyings,
            uint256 outQuote
        ) = removeLiquidityThenCloseOptions(
            rollFromOption,
            liquidity,
            amountAMin,
            amountBMin,
            to,
            deadline
        );

        bool success = addLiquidityWithUnderlying(
            rollToOption,
            outUnderlyings,
            outQuote,
            amountAMin,
            amountBMin,
            to,
            deadline
        );

        require(success, "ERR_ADD_LIQUIDITY_FAIL");

        emit RolledOptionLiquidity(
            msg.sender,
            rollFromOption,
            rollToOption,
            outUnderlyings
        );

        return success;
    }

    /**
     * @dev Rolls liquidity in an option series UNI-V2 to an option series UNI-V2 with a further expiry date.
     * @notice Pulls UNI-V2 liquidity shares from msg.sender.
     * @param rollFromOption The optionToken address to close a UNI-V2 position.
     * @param rollToOption The optionToken address to open a UNI-V2 position.
     * @param liquidity The quantity of UNI-V2 shares to roll from the first Uniswap pool.
     * @param amountAMin
     * @param amountBMin
     * @param to The address that receives the UNI-V2 shares that have been rolled.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function rollOptionLiquidity(
        address rollFromOption,
        address rollToOption,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (bool) {
        // Store router in memory for gas savings.
        IUniswapV2Router02 router = _uniswap.router;

        // Pull UNI-V2 liquidity shares from the rollFromOption series from the msg.sender to this contract.
        IERC20(getUniswapMarketForOption(rollFromOption)).safeTransferFrom(
            msg.sender,
            address(this),
            liquidity
        );

        // Remove liquidity from Uniswap V2 pool to receive option + quote tokens.
        (uint256 amountOptions, ) = router.removeLiquidity(
            rollFromOption,
            quoteToken,
            liquidity,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        // Calculate quantity of redeemTokens needed to close the rollFromOptions.
        uint256 quantityRedeemsRequired = amountOptions.mul(
            IOption(rollFromOption).getQuoteValue().div(
                IOption(rollFromOption).getBaseValue()
            )
        );

        // Pull the necessary redeem tokens from the user
        IERC20(IOption(rollFromOption).redeemToken()).safeTransferFrom(
            msg.sender,
            address(this),
            quantityRedeemsRequired
        );

        // Close the options with shorter expiry using options + redeem tokens, receive underlyingTokens.
        (, , uint256 outUnderlyings) = _primitive.trader.safeClose(
            IOption(rollFromOption),
            amountOptions,
            address(this)
        );

        // Mint options with further expiry using the underlyingTokens received from closing the rollFromOptions.
        {
            (, uint256 outputRedeems) = _primitive.trader.safeMint(
                IOption(rollToOption),
                outUnderlyings,
                address(this)
            );
            address tokenA = rollToOption;
            address tokenB = quoteToken;
            // Mint UNI-V2 liquidity shares by providing options + quote tokens to the further expiry uniswap market.
            router.addLiquidity(
                tokenA,
                tokenB,
                amountOptions,
                0,
                0,
                0,
                to,
                deadline
            );

            // Send the redeemTokens (short options) to the msg.sender.
            IERC20(IOption(rollToOption).redeemToken()).safeTransfer(
                msg.sender,
                outputRedeems
            );
        }

        emit RolledOptionLiquidity(
            msg.sender,
            rollFromOption,
            rollToOption,
            amountOptions
        );

        return true;
    }

    /**
     * @dev Closes an option position and opens a new one using the freed underlyingTokens.
     * @notice Pulls option and redeem tokens from msg.sender.
     */
    function rollOption(
        address rollFromOption,
        address rollToOption,
        address receiver,
        uint256 rollQuantity
    ) external returns (bool) {
        // Close the rollFromOption to receive underlyingTokens.
        // Sends the underlyingTokens to this contract.
        (, , uint256 outUnderlyings) = TraderLib.safeClose(
            IOption(rollFromOption),
            rollQuantity,
            address(this)
        );

        // Store in memory for gas savings.
        ITrader trader = _primitive.trader;

        // Approve underlyingTokens to be sent to the Primitive Trader contract.
        IERC20(IOption(rollFromOption).underlyingToken()).approve(
            address(trader),
            uint256(-1)
        );

        // Mint rollToOptions using the underlyingTokens received from closing the rollFromOptions.
        // Pulls underlyingTokens from this contract and sends them to the rollToOption contract.
        // Sends minted option and redeem tokens to the "receiver" address.
        (uint256 outputOptions, ) = trader.safeMint(
            IOption(rollToOption),
            outUnderlyings,
            receiver
        );

        // An event is emitted because a position was atomically rolled without additional capital; state-change.
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
     * @dev Adds liquidity to an option<>quote token pair by minting optionTokens with underlyingTokens.
     * @notice Pulls underlying tokens from msg.sender and pushes UNI-V2 liquidity tokens to the "to" address.
     * @param optionAddress The address of the optionToken to mint then provide liquidity for.
     * @param quantityOptions The quantity of underlyingTokens to use to mint optionTokens.
     * @param quantityQuoteTokens The quantity of quoteTokens to add with optionTokens to the Uniswap V2 Pair.
     * @param minQuantityOptions The minimum quantity of optionTokens expected to provide liquidity with.
     * @param minQuantityQuoteTokens The minimum quantity of quoteTokens expected to provide liquidity with.
     * @param to The address that receives UNI-V2 shares.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function addLiquidityWithUnderlying(
        address optionAddress,
        uint256 quantityOptions,
        uint256 quantityQuoteTokens,
        uint256 minQuantityOptions,
        uint256 minQuantityQuoteTokens,
        address to,
        uint256 deadline
    ) public nonReentrant returns (bool) {
        // Store in memory for gas savings.
        IUniswapV2Router02 router = _uniswap.router;
        address quoteToken_ = quoteToken;

        // Pull quote tokens from msg.sender to add to Uniswap V2 Pair.
        // Warning: calls into msg.sender using `safeTransferFrom`. Msg.sender is not trusted.
        IERC20(quoteToken_).safeTransferFrom(
            msg.sender,
            address(this),
            quantityQuoteTokens
        );

        // Pulls underlyingTokens from msg.sender to this contract.
        // Pushes underlyingTokens to option contract and mints option + redeem tokens to this contract.
        // Warning: calls into msg.sender using `safeTransferFrom`. Msg.sender is not trusted.
        (uint256 outputOptions, uint256 outputRedeems) = TraderLib.safeMint(
            IOption(optionAddress),
            quantityOptions,
            address(this)
        );

        // Approves Uniswap V2 Pair to transfer option and quote tokens from this contract.
        IERC20(optionAddress).approve(address(router), uint256(-1));
        IERC20(quoteToken_).approve(address(router), uint256(-1));

        // Adds liquidity to Uniswap V2 Pair and returns liquidity shares to the "to" address.
        (, , uint256 liquidity) = _uniswap.router.addLiquidity(
            optionAddress,
            quoteToken,
            outputOptions,
            quantityQuoteTokens,
            minQuantityOptions,
            minQuantityQuoteTokens,
            to,
            deadline
        );

        // Send redeemTokens (short option tokens) from minting option operation to msg.sender.
        IERC20(IOption(optionAddress).redeemToken()).safeTransfer(
            msg.sender,
            outputRedeems
        );

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
