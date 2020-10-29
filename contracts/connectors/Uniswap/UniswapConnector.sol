pragma solidity >=0.6.0;

/**
 * @title   Combines Uniswap V2 Protocol functions with Primitive V1.
 * @author  Primitive
 */

// Uniswap
import {
    IUniswapV2Callee
} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import {
    IUniswapV2Router02
} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {
    IUniswapV2Factory
} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import {
    IUniswapV2Pair
} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
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

contract UniswapConnector is Ownable, ReentrancyGuard, IUniswapV2Callee {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public router;
    IUniswapV2Factory public factory;
    ITrader public trader;
    IRegistry public registry;

    address public quoteToken; // Designated stablecoin for Primitive.
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    uint8 public constant VERSION = 2;

    event Initialized(address indexed from, address indexed quoteToken);
    event FlashedShortOption(
        address indexed from,
        uint256 quantity,
        uint256 premium
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
        uint256 liquidity
    );

    // solhint-disable-next-line no-empty-blocks
    constructor() public {}

    // ==== Setup Functions ====

    function initialize(
        address router_,
        address factory_,
        address trader_,
        address registry_,
        address quoteToken_
    ) external onlyOwner {
        require(address(router) == address(0x0), "ERR_INITIALIZED");
        require(address(factory) == address(0x0), "ERR_INITIALIZED");
        require(address(trader) == address(0x0), "ERR_INITIALIZED");
        require(address(registry) == address(0x0), "ERR_INITIALIZED");
        require(quoteToken == address(0x0), "ERR_INITIALIZED");
        router = IUniswapV2Router02(router_);
        factory = IUniswapV2Factory(factory_);
        trader = ITrader(trader_);
        registry = IRegistry(registry_);
        quoteToken = quoteToken_;
        emit Initialized(msg.sender, quoteToken_);
    }

    // ==== Combo Operations ====

    /**
     * @dev Mints longOptionTokens using underlyingTokens provided by user, then swaps on Uniswap V2.
     * Combines Primitive "mintOptions" function with Uniswap V2 Router "swapExactTokensForTokens" function.
     * @notice If the first address in the path is not the optionToken address, the tx will fail.
     * underlyingToken -> optionToken -> quoteToken.
     * @param optionToken The address of the Oracle-less Primitive option.
     * @param amountIn The quantity of longOptionTokens to mint and then sell.
     * @param amountOutMin The minimum quantity of tokens to receive in exchange for the longOptionTokens.
     * @param path The token addresses to trade through using their Uniswap V2 pools. Assumes path[0] = option.
     * @param to The address to send the optionToken proceeds and redeem tokens to.
     * @param deadline The timestamp for a trade to fail at if not successful.
     * @return bool Whether the transaction was successful or not.
     */
    function mintLongOptionsThenSwapToTokens(
        IOption optionToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (bool) {
        // Pulls underlyingTokens from msg.sender, then pushes underlyingTokens to option contract.
        // Mints long + short option tokens to this contract.
        (uint256 outputOptions, uint256 outputRedeems) = TraderLib.safeMint(
            optionToken,
            amountIn,
            address(this)
        );

        // Swaps longOptionTokens to the token specified at the end of the path, then sends to msg.sender.
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

        // Send shortOptionTokens (redeem) to the "to" address.
        IERC20(optionToken.redeemToken()).safeTransfer(to, outputRedeems);
        return success;
    }

    /**
     * @dev Mints long + short option tokens, then swaps the shortOptionTokens (redeem) for tokens.
     * @notice If the first address in the path is not the shortOptionToken address, the tx will fail.
     * underlyingToken -> shortOptionToken -> quoteToken.
     * IMPORTANT: redeemTokens = shortOptionTokens
     * @param optionToken The address of the Option contract.
     * @param amountIn The quantity of options to mint.
     * @param amountOutMin The minimum quantity of tokens to receive in exchange for the shortOptionTokens.
     * @param path The token addresses to trade through using their Uniswap V2 pools. Assumes path[0] = shortOptionToken.
     * @param to The address to send the shortOptionToken proceeds and longOptionTokens to.
     * @param deadline The timestamp for a trade to fail at if not successful.
     * @return bool Whether the transaction was successful or not.
     */
    function mintShortOptionsThenSwapToTokens(
        IOption optionToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) public returns (bool) {
        // Pulls underlyingTokens from msg.sender, then pushes underlyingTokens to option contract.
        // Mints long + short tokens to this contract.
        (uint256 outputOptions, uint256 outputRedeems) = TraderLib.safeMint(
            optionToken,
            amountIn,
            address(this)
        );

        // Swaps shortOptionTokens to the token specified at the end of the path, then sends to msg.sender.
        // Reverts if the first address in the path is not the shortOptionToken address.
        address redeemToken = optionToken.redeemToken();
        (, bool success) = _swapExactOptionsForTokens(
            redeemToken,
            outputRedeems, // shortOptionTokens = redeemTokens
            amountOutMin,
            path,
            to,
            deadline
        );
        // Fail early if the swap failed.
        require(success, "ERR_SWAP_FAILED");

        // Send longOptionTokens to the "to" address.
        IERC20(optionToken).safeTransfer(to, outputOptions); // longOptionTokens
        return success;
    }

    /**
     * @dev Receives underlyingTokens from a UniswapV2Pair.swap() call from a pair with
     * reserve0 = shortOptionTokens and reserve1 = underlyingTokens.
     * Uses underlyingTokens to mint long (option) + short (redeem) tokens.
     * Sends longOptionTokens to msg.sender, and pays back the UniswapV2Pair the shortOptionTokens,
     * AND any remainder quantity of underlyingTokens (paid by msg.sender).
     * @notice If the first address in the path is not the shortOptionToken address, the tx will fail.
     * @param optionAddress The address of the Option contract.
     * @param flashLoanQuantity The quantity of options to mint using borrowed underlyingTokens.
     * @param amountOutMin The minimum quantity of underlyingTokens to receive in exchange for the shortOptionTokens.
     * @param path The token addresses to trade through using their Uniswap V2 pools. Assumes path[0] = shortOptionToken.
     * @param to The address to send the shortOptionToken proceeds and longOptionTokens to.
     * @return success bool Whether the transaction was successful or not.
     */
    function flashMintShortOptionsThenSwap(
        address pairAddress,
        address optionAddress,
        uint256 flashLoanQuantity,
        uint256 amountOutMin,
        address[] memory path,
        address to
    ) public returns (bool) {
        require(flashLoanQuantity > 0, "ERR_ZERO");
        // IMPORTANT: Assume this contract has already received `flashLoanQuantity` of underlyingTokens.
        // We are flash swapping from an underlying <> shortOptionToken pair, paying back a portion using minted shortOptionTokens
        // and any remainder of underlyingToken.

        address underlyingToken = IOption(optionAddress)
            .getUnderlyingTokenAddress();
        require(path[1] == underlyingToken, "ERR_END_PATH_NOT_UNDERLYING");

        // Mint longOptionTokens using the underlyingTokens received from UniswapV2 flash swap to this contract.
        // Send underlyingTokens from this contract to the optionToken contract, then call mintOptions.
        IERC20(underlyingToken).safeTransfer(optionAddress, flashLoanQuantity);
        (uint256 outputOptions, uint256 outputRedeems) = IOption(optionAddress)
            .mintOptions(address(this));

        // Need to return tokens from the flash swap by returning shortOptionTokens and any remainder of underlyingTokens.
        {
            address underlyingToken_ = underlyingToken;
            // Gets the amount of underlyingTokens paid (amounts[1]) based on an input quantity of shortOptionTokens.
            uint256[] memory amounts = router.getAmountsOut(
                outputRedeems,
                path
            );

            // The remainder is the flash loan amount - amount paid for from shortOptionTokens.
            uint256 remainder; // underlyingTokens borrowed - underlyingTokens paid back by returning shortOptionTokens.
            {
                uint256 quantity = flashLoanQuantity; // quantity of underlying tokens borrowed
                uint256 paid = amounts[1]; // quantity of underlyingTokens paid by shortOptionTokens
                // consider the swap fee
                remainder = quantity
                    .mul(1000)
                    .add(quantity.mul(3))
                    .div(1000)
                    .sub(paid);
            }

            // Pay back the pair in shortOptionTokens
            IERC20(IOption(optionAddress).redeemToken()).safeTransfer(
                pairAddress,
                outputRedeems
            );

            // Pull underlyingTokens from the original msg.sender to pay the remainder of the flash swap.
            IERC20(underlyingToken_).safeTransferFrom(
                to,
                pairAddress,
                remainder
            );
            emit FlashedShortOption(msg.sender, outputOptions, remainder);
        }

        // Send longOptionTokens (option) to the original msg.sender.
        IERC20(optionAddress).safeTransfer(to, outputOptions);
        return true;
    }

    /**
     * @dev Opens a longOptionToken position by minting long + short tokens, then selling the short tokens.
     * @notice IMPORTANT: amountOutMin parameter is the price to swap shortOptionTokens to underlyingTokens.
     * IMPORTANT: If the ratio between shortOptionTokens and underlyingTokens is 1:1, then only the swap fee (0.30%) has to be paid.
     * @param optionToken The option address.
     * @param amountOptions The quantity of longOptionTokens to purchase.
     * @param amountOutMin The minimum quantity of underlyingTokens to receive in exchange for the shortOptionTokens.
     */
    function openFlashLong(
        IOption optionToken,
        uint256 amountOptions,
        uint256 amountOutMin
    ) external nonReentrant returns (bool) {
        address redeemToken = optionToken.redeemToken();
        address underlyingToken = optionToken.getUnderlyingTokenAddress();
        address pairAddress = factory.getPair(redeemToken, underlyingToken);

        // Build the path to get the appropriate reserves to borrow from, and then pay back.
        // We are borrowing from reserve1 then paying it back mostly in reserve0.
        // Borrowing underlyingTokens, paying back in shortOptionTokens (normal swap). Pay any remainder in underlyingTokens.
        address[] memory path = new address[](2);
        path[0] = redeemToken;
        path[1] = underlyingToken;
        IUniswapV2Pair pair = IUniswapV2Pair(pairAddress);

        bytes4 selector = bytes4(
            keccak256(
                bytes(
                    "flashMintShortOptionsThenSwap(address,address,uint256,uint256,address[],address)"
                )
            )
        );
        bytes memory params = abi.encodeWithSelector(
            selector, // function to call in this contract
            pairAddress, // pair contract we are borrowing from
            optionToken, // option token to mint with flash loaned tokens
            amountOptions, // quantity of underlyingTokens from flash loan to use to mint options
            amountOutMin, // total price paid (in underlyingTokens) for selling shortOptionTokens
            path, // redeemToken -> underlyingToken
            msg.sender // address to pull the remainder loan amount to pay, and send longOptionTokens to.
        );

        // Receives 0 quoteTokens and `amountOptions` of underlyingTokens to `this` contract address.
        // Then executes `flashMintShortOptionsThenSwap`.
        uint256 amount0Out = pair.token0() == underlyingToken
            ? amountOptions
            : 0;
        uint256 amount1Out = pair.token0() == underlyingToken
            ? 0
            : amountOptions;

        // Borrow the amountOptions quantity of underlyingTokens and execute the callback function using params.
        pair.swap(amount0Out, amount1Out, address(this), params);
        return true;
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
        // Sends minted long + short tokens to the "receiver" address.
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
     * @dev Adds liquidity to an option<>quote token pair by minting longOptionTokens with underlyingTokens.
     * @notice Pulls underlying tokens from msg.sender and pushes UNI-V2 liquidity tokens to the "to" address.
     * underlyingToken -> optionToken -> UNI-V2.
     * @param optionAddress The address of the optionToken to mint then provide liquidity for.
     * @param quantityOptions The quantity of underlyingTokens to use to mint longOptionTokens.
     * @param quantityQuoteTokens The quantity of quoteTokens to add with longOptionTokens to the Uniswap V2 Pair.
     * @param minQuantityOptions The minimum quantity of longOptionTokens expected to provide liquidity with.
     * @param minQuantityQuoteTokens The minimum quantity of quoteTokens expected to provide liquidity with.
     * @param to The address that receives UNI-V2 shares.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function addLongLiquidityWithUnderlying(
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

        // Send shortOptionTokens (redeem) from minting option operation to msg.sender.
        IERC20(IOption(optionAddress).redeemToken()).safeTransfer(
            msg.sender,
            outputRedeems
        );
        return true;
    }

    /**
     * @dev Adds redeemToken liquidity to a redeem<>quote token pair by minting shortOptionTokens with underlyingTokens.
     * @notice Pulls underlying tokens from msg.sender and pushes UNI-V2 liquidity tokens to the "to" address.
     * underlyingToken -> redeemToken -> UNI-V2.
     * @param optionAddress The address of the optionToken to get the redeemToken to mint then provide liquidity for.
     * @param quantityOptions The quantity of underlyingTokens to use to mint option + redeem tokens.
     * @param quantityQuoteTokens The quantity of quoteTokens to add with shortOptionTokens to the Uniswap V2 Pair.
     * @param minShortTokens The minimum quantity of shortOptionTokens expected to provide liquidity with.
     * @param minQuantityQuoteTokens The minimum quantity of quoteTokens expected to provide liquidity with.
     * @param to The address that receives UNI-V2 shares.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function addShortLiquidityWithUnderlying(
        address optionAddress,
        uint256 quantityOptions,
        uint256 quantityQuoteTokens,
        uint256 minShortTokens,
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

        address redeemToken = IOption(optionAddress).redeemToken();

        // Approves Uniswap V2 Pair to transfer option and quote tokens from this contract.
        IERC20(redeemToken).approve(address(router_), uint256(-1));
        IERC20(quoteToken_).approve(address(router_), uint256(-1));

        // Adds liquidity to Uniswap V2 Pair and returns liquidity shares to the "to" address.
        router_.addLiquidity(
            redeemToken,
            quoteToken,
            outputRedeems,
            quantityQuoteTokens,
            minShortTokens,
            minQuantityQuoteTokens,
            to,
            deadline
        );

        // Send longOptionTokens from minting option operation to msg.sender.
        IERC20(optionAddress).safeTransfer(msg.sender, outputOptions);
        return true;
    }

    /**
     * @dev Combines Uniswap V2 Router "removeLiquidity" function with Primitive "closeOptions" function.
     * @notice Pulls UNI-V2 liquidity shares with option<>quote token, and redeemTokens from msg.sender.
     * Then closes the longOptionTokens and withdraws underlyingTokens to the "to" address.
     * Sends quoteTokens from the burned UNI-V2 liquidity shares to the "to" address.
     * UNI-V2 -> optionToken -> underlyingToken.
     * @param optionAddress The address of the option that will be closed from burned UNI-V2 liquidity shares.
     * @param liquidity The quantity of liquidity tokens to pull from msg.sender and burn.
     * @param amountAMin The minimum quantity of longOptionTokens to receive from removing liquidity.
     * @param amountBMin The minimum quantity of quoteTokens to receive from removing liquidity.
     * @param to The address that receives quoteTokens from burned UNI-V2, and underlyingTokens from closed options.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function removeLongLiquidityThenCloseOptions(
        address optionAddress,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public nonReentrant returns (uint256, uint256) {
        // Store in memory for gas savings.
        address quoteToken_ = quoteToken;
        IOption optionToken = IOption(optionAddress);
        IUniswapV2Router02 router_ = router;

        {
            // Gets the Uniswap V2 Pair address for optionAddress and quoteToken.
            // Transfers the LP tokens for the pair to this contract.
            // Warning: external call to a non-trusted address `msg.sender`.
            address pair = getUniswapMarketForToken(optionAddress);
            IERC20(pair).safeTransferFrom(msg.sender, address(this), liquidity);
            IERC20(pair).approve(address(router_), uint256(-1));
        }

        // Remove liquidity from Uniswap V2 pool to receive pool tokens (option + quote tokens).
        (uint256 amountOptions, uint256 amountQuote) = router_.removeLiquidity(
            optionAddress,
            quoteToken_,
            liquidity,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        // Approves trader to pull longOptionTokens and shortOptionTOkens from this contract to close options.
        ITrader trader_ = trader;
        {
            address redeemToken = optionToken.redeemToken();
            IERC20(optionAddress).approve(address(trader_), uint256(-1));
            IERC20(redeemToken).approve(address(trader_), uint256(-1));

            // Calculate equivalent quantity of redeem (short option) tokens to close the option position.
            // Need to cancel base units and have quote units remaining.
            uint256 requiredRedeems = amountOptions
                .mul(optionToken.getQuoteValue())
                .div(optionToken.getBaseValue());

            // Pull the required shortOptionTokens from msg.sender to this contract.
            IERC20(redeemToken).safeTransferFrom(
                msg.sender,
                address(this),
                requiredRedeems
            );
        }

        // Pushes option and redeem tokens to the option contract and calls "closeOption".
        // Receives underlyingTokens and sends them to the "to" address.
        trader_.safeClose(optionToken, amountOptions, to);

        // Send the quoteTokens received from burning liquidity shares to the "to" address.
        IERC20(quoteToken_).safeTransfer(to, amountQuote);
        return (amountOptions, amountQuote);
    }

    /**
     * @dev Combines Uniswap V2 Router "removeLiquidity" function with Primitive "closeOptions" function.
     * @notice Pulls UNI-V2 liquidity shares with shortOption<>quote token, and optionTokens from msg.sender.
     * Then closes the longOptionTokens and withdraws underlyingTokens to the "to" address.
     * Sends quoteTokens from the burned UNI-V2 liquidity shares to the "to" address.
     * UNI-V2 -> optionToken -> underlyingToken.
     * @param optionAddress The address of the option that will be closed from burned UNI-V2 liquidity shares.
     * @param liquidity The quantity of liquidity tokens to pull from msg.sender and burn.
     * @param amountAMin The minimum quantity of shortOptionTokens to receive from removing liquidity.
     * @param amountBMin The minimum quantity of quoteTokens to receive from removing liquidity.
     * @param to The address that receives quoteTokens from burned UNI-V2, and underlyingTokens from closed options.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function removeShortLiquidityThenCloseOptions(
        address optionAddress,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public nonReentrant returns (uint256, uint256) {
        // Store in memory for gas savings.
        address quoteToken_ = quoteToken;
        address redeemToken = IOption(optionAddress).redeemToken();
        IUniswapV2Router02 router_ = router;

        {
            // Gets the Uniswap V2 Pair address for shortOptionToken and quoteToken.
            // Transfers the LP tokens for the pair to this contract.
            // Warning: external call to a non-trusted address `msg.sender`.
            address pair = getUniswapMarketForToken(redeemToken);
            IERC20(pair).safeTransferFrom(msg.sender, address(this), liquidity);
            IERC20(pair).approve(address(router_), uint256(-1));
        }

        // Remove liquidity from Uniswap V2 pool to receive pool tokens (shortOptionTokens + quoteTokens).
        (uint256 amountShortOptions, uint256 amountQuote) = router_
            .removeLiquidity(
            redeemToken,
            quoteToken_,
            liquidity,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        // Approves trader to pull longOptionTokens and shortOptionTOkens from this contract to close options.
        {
            ITrader trader_ = trader;
            IOption optionToken = IOption(optionAddress);
            IERC20(address(optionToken)).approve(address(trader_), uint256(-1));
            IERC20(redeemToken).approve(address(trader_), uint256(-1));

            // Calculate equivalent quantity of redeem (short option) tokens to close the option position.
            // Need to cancel base units and have quote units remaining.
            uint256 requiredLongOptionTokens = amountShortOptions
                .mul(optionToken.getBaseValue())
                .mul(1 ether)
                .div(optionToken.getQuoteValue())
                .div(1 ether);

            // Pull the required longOptionTokens from msg.sender to this contract.
            IERC20(address(optionToken)).safeTransferFrom(
                msg.sender,
                address(this),
                requiredLongOptionTokens
            );
            // Pushes option and redeem tokens to the option contract and calls "closeOption".
            // Receives underlyingTokens and sends them to the "to" address.
            trader_.safeClose(optionToken, requiredLongOptionTokens, to);
        }

        // Send the quoteTokens received from burning liquidity shares to the "to" address.
        IERC20(quoteToken_).safeTransfer(to, amountQuote);
        return (amountShortOptions, amountQuote);
    }

    /**
     * @dev Combines "removeLongLiquidityThenCloseOptions" function with "addLongLiquidityWithUnderlying" fuction.
     * @notice Rolls UNI-V2 liquidity in an option<>quote pair to a different option<>quote pair.
     * UNI-V2 -> rollFromOption -> underlyingToken -> rollToOption -> UNI-V2.
     * @param rollFromOption The optionToken address to close a UNI-V2 position.
     * @param rollToOption The optionToken address to open a UNI-V2 position.
     * @param liquidity The quantity of UNI-V2 shares to roll from the first Uniswap pool.
     * @param amountAMin The minimum quantity of longOptionTokens to receive from removing liquidity.
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
        ) = removeLongLiquidityThenCloseOptions(
            rollFromOption,
            liquidity,
            amountAMin,
            amountBMin,
            to,
            deadline
        );

        bool success = addLongLiquidityWithUnderlying(
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
            liquidity
        );

        return success;
    }

    // ==== Internal Functions ====

    /**
     * @dev Calls the "swapExactTokensForTokens" function on the Uniswap V2 Router 02 Contract.
     * @notice Fails early if the address in the beginning of the path is not the token address.
     * @param tokenAddress The address of the token to swap from.
     * @param amountIn The quantity of longOptionTokens to swap with.
     * @param amountOutMin The minimum quantity of tokens to receive in exchange for the tokens swapped.
     * @param path The token addresses to trade through using their Uniswap V2 pairs.
     * @param to The address to send the token proceeds to.
     * @param deadline The timestamp for a trade to fail at if not successful.
     */
    function _swapExactOptionsForTokens(
        address tokenAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) internal returns (uint256[] memory amounts, bool success) {
        // Fails early if the token being swapped from is not the optionToken.
        require(path[0] == tokenAddress, "ERR_PATH_OPTION_START");

        // Store router in memory for gas savings.
        IUniswapV2Router02 router_ = router;

        // Approve the uniswap router to be able to transfer longOptionTokens from this contract.
        IERC20(tokenAddress).approve(address(router_), uint256(-1));
        // Call the Uniswap V2 function to swap longOptionTokens to quoteTokens.
        (amounts) = router_.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );
        success = true;
    }

    // ==== Callback Implementation ====

    /**
     * @dev The callback function triggered in a UniswapV2Pair.swap() call when the `data` parameter has data.
     * @param sender The original msg.sender of the UniswapV2Pair.swap() call.
     * @param amount0 The quantity of token0 received to the `to` address in the swap() call.
     * @param amount1 The quantity of token1 received to the `to` address in the swap() call.
     * @param data The payload passed in the `data` parameter of the swap() call.
     */
    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        (bool success, bytes memory returnData) = address(this).call(data);
        require(
            success &&
                (returnData.length == 0 || abi.decode(returnData, (bool))),
            "ERR_UNISWAPV2_CALL_FAIL"
        );
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
     * @dev Gets a Uniswap Pair address for a token and quote token.
     * @param tokenAddress The address of the token to get a Uniswap V2 Pair address for (with quoteToken).
     */
    function getUniswapMarketForToken(address tokenAddress)
        public
        view
        returns (address)
    {
        address uniswapPair = factory.getPair(tokenAddress, quoteToken);
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
        return getUniswapMarketForToken(optionAddress);
    }
}
