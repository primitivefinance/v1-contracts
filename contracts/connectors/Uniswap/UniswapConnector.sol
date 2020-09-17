pragma solidity >=0.6.0;

/**
 * @title   Combines Uniswap V2 Protocol functions with Primitive V1.
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
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract UniswapConnector is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public router;
    IUniswapV2Factory public factory;
    ITrader public trader;
    IRegistry public registry;
    address public quoteToken; // Designated stablecoin for Primitive.

    event UpdatedRouter(address indexed from, address indexed newRouter);
    event UpdatedFactory(address indexed from, address indexed newFactory);
    event UpdatedTrader(address indexed from, address indexed newTrader);
    event UpdatedRegistry(address indexed from, address indexed newRegistry);
    event UpdatedQuoteToken(address indexed from, address indexed newQuote);

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
     * @dev Sets the Uniswap V2 Router address to use.
     */
    function setRouter(address router_) external onlyOwner {
        router = IUniswapV2Router02(router_);
        emit UpdatedRouter(msg.sender, router_);
    }

    /**
     * @dev Sets the Uniswap V2 Factory address to use.
     */
    function setFactory(address factory_) external onlyOwner {
        factory = IUniswapV2Factory(factory_);
        emit UpdatedFactory(msg.sender, factory_);
    }

    /**
     * @dev Sets the Primitive V1 Trader address to use.
     */
    function setTrader(address trader_) external onlyOwner {
        trader = ITrader(trader_);
        emit UpdatedTrader(msg.sender, trader_);
    }

    /**
     * @dev Sets the Primitive V1 Registry address to use.
     */
    function setRegistry(address registry_) external onlyOwner {
        registry = IRegistry(registry_);
        emit UpdatedRegistry(msg.sender, registry_);
    }

    /**
     * @dev Sets the designated stablecoin to use (paired token in Uniswap pools).
     */
    function setQuoteToken(address quoteToken_) external onlyOwner {
        quoteToken = quoteToken_;
        emit UpdatedQuoteToken(msg.sender, quoteToken_);
    }

    // ==== Trading Functions ====

    /**
     * @dev Mints options using underlyingTokens provided by user, then swaps on Uniswap V2.
     * Combines Primitive "mintOptions" function with Uniswap V2 Router "swapExactTokensForTokens" function.
     * @notice If the first address in the path is not the optionToken address, the tx will fail.
     * underlyingToken -> optionToken -> quoteToken.
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
            outputOptions,
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
     * @dev Combines Uniswap V2 Router "removeLiquidity" function with Primitive "closeOptions" function.
     * @notice Pulls UNI-V2 liquidity shares with option<>quote token and redeemToken from msg.sender.
     * Then closes the optionTokens and withdraws underlyingTokens to the "to" address.
     * Sends quoteTokens from the burned UNI-V2 liquidity shares to the "to" address.
     * UNI-V2 -> optionToken -> underlyingToken.
     * @param optionAddress The address of the option that will be closed from burned UNI-V2 liquidity shares.
     * @param liquidity The quantity of liquidity tokens to pull from msg.sender and burn.
     * @param amountAMin The minimum quantity of optionTokens to receive from removing liquidity.
     * @param amountBMin The minimum quantity of quoteTokens to receive from removing liquidity.
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
        uint256 requiredRedeems = amountOptions
            .mul(IOption(optionAddress).getQuoteValue())
            .div(IOption(optionAddress).getBaseValue());

        // Pull the required redeemTokens from msg.sender to this contract.
        IERC20(IOption(optionAddress).redeemToken()).safeTransferFrom(
            msg.sender,
            address(this),
            requiredRedeems
        );

        // Pushes option and redeem tokens to the option contract and calls "closeOption".
        // Receives underlyingTokens and sends them to the "to" address.
        trader.safeClose(IOption(optionAddress), amountOptions, to);

        // Send the quoteTokens received from burning liquidity shares to the "to" address.
        IERC20(quoteToken_).safeTransfer(to, amountQuote);

        return (amountOptions, amountQuote);
    }

    /**
     * @dev Combines "removeLiquidityThenCloseOptions" function with "addLiquidityWithUnderlying" fuction.
     * @notice Rolls UNI-V2 liquidity in an option<>quote pair to a different option<>quote pair.
     * UNI-V2 -> rollFromOption -> underlyingToken -> rollToOption -> UNI-V2.
     * @param rollFromOption The optionToken address to close a UNI-V2 position.
     * @param rollToOption The optionToken address to open a UNI-V2 position.
     * @param liquidity The quantity of UNI-V2 shares to roll from the first Uniswap pool.
     * @param amountAMin The minimum quantity of optionTokens to receive from removing liquidity.
     * @param amountBMin The minimum quantity of quoteTokens to receive from removing liquidity.
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
     * @dev Closes an option position and opens a new one using the freed underlyingTokens.
     * @notice Pulls option and redeem tokens from msg.sender, then sends minted option + redeems to receiver.
     * rollFromOption -> underlyingToken -> rollToOption.
     * @param rollFromOption The optionToken to close.
     * @param rollToOption The optionToken to mint.
     * @param rollQuantity The quantity of underlyingTokens to receive from closed options then use to mint new options.
     * @param receiver The address that receives newly minted option and redeem tokens.
     */
    function rollOption(
        address rollFromOption,
        address rollToOption,
        uint256 rollQuantity,
        address receiver
    ) external returns (bool) {
        // Close the rollFromOption to receive underlyingTokens.
        // Sends the underlyingTokens to this contract.
        (, , uint256 outUnderlyings) = TraderLib.safeClose(
            IOption(rollFromOption),
            rollQuantity,
            address(this)
        );

        // Store in memory for gas savings.
        ITrader trader_ = trader;

        // Approve underlyingTokens to be sent to the Primitive Trader contract.
        IERC20(IOption(rollFromOption).getUnderlyingTokenAddress()).approve(
            address(trader_),
            uint256(-1)
        );

        // Mint rollToOptions using the underlyingTokens received from closing the rollFromOptions.
        // Pulls underlyingTokens from this contract and sends them to the rollToOption contract.
        // Sends minted option and redeem tokens to the "receiver" address.
        (uint256 outputOptions, ) = trader_.safeMint(
            IOption(rollToOption),
            outUnderlyings,
            receiver
        );

        // An event is emitted because a position was atomically rolled without additional capital.
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
     * underlyingToken -> optionToken -> UNI-V2.
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
        IUniswapV2Router02 router_ = router;
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
        IERC20(optionAddress).approve(address(router_), uint256(-1));
        IERC20(quoteToken_).approve(address(router_), uint256(-1));

        // Adds liquidity to Uniswap V2 Pair and returns liquidity shares to the "to" address.
        router_.addLiquidity(
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

    // ==== Internal Functions ====

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
        address optionAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) internal returns (uint256[] memory amounts, bool success) {
        // Fails early if the token being swapped from is not the optionToken.
        require(path[0] == optionAddress, "ERR_PATH_OPTION_START");

        // Store router in memory for gas savings.
        IUniswapV2Router02 router_ = router;

        // Approve the uniswap router to be able to transfer options from this contract.
        IERC20(optionAddress).approve(address(router_), uint256(-1));

        // Call the Uniswap V2 function to swap optionTokens to quoteTokens.
        (amounts) = router_.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );
        success = true;
    }

    // ==== Management Functions ====

    /**
     * @dev Creats a Uniswap pair for option<>quote tokens.
     * @param optionAddress The address of the option to deploy a Uniswap V2 Pair for with the quoteToken.
     */
    function deployUniswapMarket(address optionAddress)
        external
        returns (address)
    {
        address uniswapPair = factory.createPair(optionAddress, quoteToken);
        return uniswapPair;
    }

    // ==== View ====

    /**
     * @dev The maxmium deadline available for each trade.
     */
    function getMaxDeadline() public view returns (uint256) {
        // solhint-disable-next-line not-rely-on-time
        uint256 deadline = now + 15 minutes;
        return deadline;
    }

    /**
     * @dev Gets a Uniswap Pair address for an option token and quote token.
     * @param optionAddress The address of the option to get a Uniswap V2 Pair address for (with quoteToken).
     */
    function getUniswapMarketForOption(address optionAddress)
        public
        view
        returns (address)
    {
        address uniswapPair = factory.getPair(optionAddress, quoteToken);
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
        address optionAddress = registry.getOptionAddress(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        require(optionAddress != address(0x0), "ERR_OPTION_DOES_NOT_EXIST");
        return getUniswapMarketForOption(optionAddress);
    }
}
