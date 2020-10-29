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
import { ITrader } from "../../option/interfaces/ITrader.sol";
import { TraderLib } from "../../option/libraries/TraderLib.sol";
import { UniswapConnectorLib } from "./UniswapConnectorLib.sol";
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

    uint8 public constant VERSION = 2;

    event Initialized(address indexed from);
    event FlashedShortOption(
        address indexed from,
        uint256 quantity,
        uint256 premium
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
        address trader_
    ) external onlyOwner {
        require(address(router) == address(0x0), "ERR_INITIALIZED");
        require(address(factory) == address(0x0), "ERR_INITIALIZED");
        require(address(trader) == address(0x0), "ERR_INITIALIZED");
        router = IUniswapV2Router02(router_);
        factory = IUniswapV2Factory(factory_);
        trader = ITrader(trader_);
        emit Initialized(msg.sender);
    }

    // ==== Combo Operations ====

    /**
     * @dev Mints long + short option tokens, then swaps the longOptionTokens (option) for tokens.
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
        bool success = UniswapConnectorLib.mintLongOptionsThenSwapToTokens(
            router,
            optionToken,
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );
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
        bool success = UniswapConnectorLib.mintShortOptionsThenSwapToTokens(
            router,
            optionToken,
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        );
        return success;
    }

    // ==== Flash Open Functions ====

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
        require(msg.sender == address(this), "ERR_NOT_SELF");
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

    // ==== Liquidity Functions ====

    /**
     * @dev Adds liquidity to an option<>token pair by minting longOptionTokens with underlyingTokens.
     * @notice Pulls underlying tokens from msg.sender and pushes UNI-V2 liquidity tokens to the "to" address.
     * underlyingToken -> optionToken -> UNI-V2.
     * @param optionAddress The address of the optionToken to mint then provide liquidity for.
     * @param otherTokenAddress The address of the otherToken in the pair with the optionToken.
     * @param quantityOptions The quantity of underlyingTokens to use to mint longOptionTokens.
     * @param quantityOtherTokens The quantity of otherTokens to add with longOptionTokens to the Uniswap V2 Pair.
     * @param minOptionTokens The minimum quantity of longOptionTokens expected to provide liquidity with.
     * @param minOtherTokens The minimum quantity of otherTokens expected to provide liquidity with.
     * @param to The address that receives UNI-V2 shares.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function addLongLiquidityWithUnderlying(
        address optionAddress,
        address otherTokenAddress,
        uint256 quantityOptions,
        uint256 quantityOtherTokens,
        uint256 minOptionTokens,
        uint256 minOtherTokens,
        address to,
        uint256 deadline
    ) public nonReentrant returns (bool) {
        bool success = UniswapConnectorLib.addLongLiquidityWithUnderlying(
            router,
            optionAddress,
            otherTokenAddress,
            quantityOptions,
            quantityOtherTokens,
            minOptionTokens,
            minOtherTokens,
            to,
            deadline
        );
        return success;
    }

    /**
     * @dev Adds redeemToken liquidity to a redeem<>token pair by minting shortOptionTokens with underlyingTokens.
     * @notice Pulls underlying tokens from msg.sender and pushes UNI-V2 liquidity tokens to the "to" address.
     * underlyingToken -> redeemToken -> UNI-V2.
     * @param optionAddress The address of the optionToken to get the redeemToken to mint then provide liquidity for.
     * @param otherTokenAddress IMPORTANT: Should be the underlyingToken of the optionToken. Address of other reserve asset.
     * @param quantityOptions The quantity of underlyingTokens to use to mint option + redeem tokens.
     * @param quantityOtherTokens The quantity of otherTokens to add with shortOptionTokens to the Uniswap V2 Pair.
     * @param minShortTokens The minimum quantity of shortOptionTokens expected to provide liquidity with.
     * @param minOtherTokens The minimum quantity of otherTokens expected to provide liquidity with.
     * @param to The address that receives UNI-V2 shares.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function addShortLiquidityWithUnderlying(
        address optionAddress,
        address otherTokenAddress,
        uint256 quantityOptions,
        uint256 quantityOtherTokens,
        uint256 minShortTokens,
        uint256 minOtherTokens,
        address to,
        uint256 deadline
    ) public nonReentrant returns (bool) {
        bool success = UniswapConnectorLib.addShortLiquidityWithUnderlying(
            router,
            optionAddress,
            otherTokenAddress,
            quantityOptions,
            quantityOtherTokens,
            minShortTokens,
            minOtherTokens,
            to,
            deadline
        );
        return success;
    }

    /**
     * @dev Combines Uniswap V2 Router "removeLiquidity" function with Primitive "closeOptions" function.
     * @notice Pulls UNI-V2 liquidity shares with option<>other token, and redeemTokens from msg.sender.
     * Then closes the longOptionTokens and withdraws underlyingTokens to the "to" address.
     * Sends otherTokens from the burned UNI-V2 liquidity shares to the "to" address.
     * UNI-V2 -> optionToken -> underlyingToken.
     * @param optionAddress The address of the option that will be closed from burned UNI-V2 liquidity shares.
     * @param otherTokenAddress The address of the other token in the pair with the options.
     * @param liquidity The quantity of liquidity tokens to pull from msg.sender and burn.
     * @param amountAMin The minimum quantity of longOptionTokens to receive from removing liquidity.
     * @param amountBMin The minimum quantity of otherTokens to receive from removing liquidity.
     * @param to The address that receives otherTokens from burned UNI-V2, and underlyingTokens from closed options.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function removeLongLiquidityThenCloseOptions(
        address optionAddress,
        address otherTokenAddress,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public nonReentrant returns (uint256, uint256) {
        (uint256 amountOptions, uint256 amountOtherTokens) = UniswapConnectorLib
            .removeLongLiquidityThenCloseOptions(
            factory,
            router,
            trader,
            optionAddress,
            otherTokenAddress,
            liquidity,
            amountAMin,
            amountBMin,
            to,
            deadline
        );

        return (amountOptions, amountOtherTokens);
    }

    /**
     * @dev Combines Uniswap V2 Router "removeLiquidity" function with Primitive "closeOptions" function.
     * @notice Pulls UNI-V2 liquidity shares with shortOption<>quote token, and optionTokens from msg.sender.
     * Then closes the longOptionTokens and withdraws underlyingTokens to the "to" address.
     * Sends quoteTokens from the burned UNI-V2 liquidity shares to the "to" address.
     * UNI-V2 -> optionToken -> underlyingToken.
     * @param optionAddress The address of the option that will be closed from burned UNI-V2 liquidity shares.
     * @param otherTokenAddress The address of the other token in the option pair.
     * @param liquidity The quantity of liquidity tokens to pull from msg.sender and burn.
     * @param amountAMin The minimum quantity of shortOptionTokens to receive from removing liquidity.
     * @param amountBMin The minimum quantity of quoteTokens to receive from removing liquidity.
     * @param to The address that receives quoteTokens from burned UNI-V2, and underlyingTokens from closed options.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function removeShortLiquidityThenCloseOptions(
        address optionAddress,
        address otherTokenAddress,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public nonReentrant returns (uint256, uint256) {
        (uint256 amountOptions, uint256 amountOtherTokens) = UniswapConnectorLib
            .removeShortLiquidityThenCloseOptions(
            factory,
            router,
            trader,
            optionAddress,
            otherTokenAddress,
            liquidity,
            amountAMin,
            amountBMin,
            to,
            deadline
        );

        return (amountOptions, amountOtherTokens);
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
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        assert(msg.sender == factory.getPair(token0, token1)); // ensure that msg.sender is actually a V2 pair
        (bool success, bytes memory returnData) = address(this).call(data);
        require(
            success &&
                (returnData.length == 0 || abi.decode(returnData, (bool))),
            "ERR_UNISWAPV2_CALL_FAIL"
        );
    }

    // ==== Management Functions ====

    /**
     * @dev Creats a Uniswap pair for option<>other tokens.
     * @param optionAddress The address of the option to deploy a Uniswap V2 Pair for with the quoteToken.
     */
    function deployUniswapMarket(address optionAddress, address otherToken)
        external
        returns (address)
    {
        address uniswapPair = factory.createPair(optionAddress, otherToken);
        return uniswapPair;
    }

    // ==== View ====

    /**
     * @dev Gets a Uniswap Pair address for two tokens.
     */
    function getUniswapMarketForTokens(address token0, address token1)
        public
        view
        returns (address)
    {
        address uniswapPair = factory.getPair(token0, token1);
        require(uniswapPair != address(0x0), "ERR_PAIR_DOES_NOT_EXIST");
        return uniswapPair;
    }
}
