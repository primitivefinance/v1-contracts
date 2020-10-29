pragma solidity >=0.6.0;

/**
 * @title   Library for business logic for connecting Uniswap V2 Protocol functions with Primitive V1.
 * @notice  Primitive V1 Uniswap Connector Lib 2 - @primitivefi/contracts@v0.4.1
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
import { IWETH, WethRouterLib } from "../WETH/WethRouterLib.sol";
import { IWethConnector } from "../WETH/IWethConnector.sol";
// Open Zeppelin
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

library UniswapConnectorLib02 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

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
        IUniswapV2Router02 router,
        IOption optionToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) internal returns (bool) {
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
            router,
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
        IUniswapV2Router02 router,
        IOption optionToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) internal returns (bool) {
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
            router,
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
        IUniswapV2Router02 router,
        address pairAddress,
        address optionAddress,
        uint256 flashLoanQuantity,
        uint256 amountOutMin,
        address[] memory path,
        address to
    ) internal returns (bool) {
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
        IUniswapV2Factory factory,
        IOption optionToken,
        uint256 amountOptions,
        uint256 amountOutMin
    ) internal returns (bool) {
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
        IUniswapV2Router02 router,
        address optionAddress,
        address otherTokenAddress,
        uint256 quantityOptions,
        uint256 quantityOtherTokens,
        uint256 minOptionTokens,
        uint256 minOtherTokens,
        address to,
        uint256 deadline
    ) internal returns (bool) {
        // Pull otherTokens from msg.sender to add to Uniswap V2 Pair.
        // Warning: calls into msg.sender using `safeTransferFrom`. Msg.sender is not trusted.
        IERC20(otherTokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            quantityOtherTokens
        );

        // Pulls underlyingTokens from msg.sender to this contract.
        // Pushes underlyingTokens to option contract and mints option + redeem tokens to this contract.
        // Warning: calls into msg.sender using `safeTransferFrom`. Msg.sender is not trusted.
        (uint256 outputOptions, uint256 outputRedeems) = TraderLib.safeMint(
            IOption(optionAddress),
            quantityOptions,
            address(this)
        );
        assert(outputOptions == quantityOptions);

        // Approves Uniswap V2 Pair to transfer option and quote tokens from this contract.
        IERC20(optionAddress).approve(address(router), uint256(-1));
        IERC20(otherTokenAddress).approve(address(router), uint256(-1));

        // Adds liquidity to Uniswap V2 Pair and returns liquidity shares to the "to" address.
        router.addLiquidity(
            optionAddress,
            otherTokenAddress,
            quantityOptions,
            quantityOtherTokens,
            minOptionTokens,
            minOtherTokens,
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
     * @dev Adds liquidity to an option<>token pair by minting longOptionTokens with underlyingTokens.
     * @notice Pulls underlying tokens from msg.sender and pushes UNI-V2 liquidity tokens to the "to" address.
     * underlyingToken -> optionToken -> UNI-V2.
     * @param optionAddress The address of the optionToken to mint then provide liquidity for.
     * @param otherTokenAddress The address of the otherToken in the pair with the optionToken.
     * @param quantityOtherTokens The quantity of otherTokens to add with longOptionTokens to the Uniswap V2 Pair.
     * @param minOptionTokens The minimum quantity of longOptionTokens expected to provide liquidity with.
     * @param minOtherTokens The minimum quantity of otherTokens expected to provide liquidity with.
     * @param to The address that receives UNI-V2 shares.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function addLongLiquidityWithETHUnderlying(
        IWETH weth,
        IUniswapV2Router02 router,
        address optionAddress,
        address otherTokenAddress,
        uint256 quantityOtherTokens,
        uint256 minOptionTokens,
        uint256 minOtherTokens,
        address to,
        uint256 deadline
    ) internal returns (bool) {
        // Pull otherTokens from msg.sender to add to Uniswap V2 Pair.
        // Warning: calls into msg.sender using `safeTransferFrom`. Msg.sender is not trusted.
        IERC20(otherTokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            quantityOtherTokens
        );

        // Pulls underlyingTokens from msg.sender to this contract.
        // Pushes underlyingTokens to option contract and mints option + redeem tokens to this contract.
        // Warning: calls into msg.sender using `safeTransferFrom`. Msg.sender is not trusted.
        (uint256 outputOptions, uint256 outputRedeems) = WethRouterLib
            .safeMintWithETH(weth, IOption(optionAddress), address(this));
        assert(outputOptions == msg.value);

        // Approves Uniswap V2 Pair to transfer option and quote tokens from this contract.
        IERC20(optionAddress).approve(address(router), uint256(-1));
        IERC20(otherTokenAddress).approve(address(router), uint256(-1));

        // Adds liquidity to Uniswap V2 Pair and returns liquidity shares to the "to" address.
        router.addLiquidity(
            optionAddress,
            otherTokenAddress,
            msg.value,
            quantityOtherTokens,
            minOptionTokens,
            minOtherTokens,
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
     * @param otherTokenAddress The address of the otherToken in the pair with the optionToken.
     * @param quantityOptions The quantity of underlyingTokens to use to mint option + redeem tokens.
     * @param quantityOtherTokens The quantity of otherTokens to add with shortOptionTokens to the Uniswap V2 Pair.
     * @param minShortTokens The minimum quantity of shortOptionTokens expected to provide liquidity with.
     * @param minOtherTokens The minimum quantity of otherTokens expected to provide liquidity with.
     * @param to The address that receives UNI-V2 shares.
     * @param deadline The timestamp to expire a pending transaction.
     */
    function addShortLiquidityWithUnderlying(
        IUniswapV2Router02 router,
        address optionAddress,
        address otherTokenAddress,
        uint256 quantityOptions,
        uint256 quantityOtherTokens,
        uint256 minShortTokens,
        uint256 minOtherTokens,
        address to,
        uint256 deadline
    ) internal returns (bool) {
        // Pull quote tokens from msg.sender to add to Uniswap V2 Pair.
        // Warning: calls into msg.sender using `safeTransferFrom`. Msg.sender is not trusted.
        IERC20(otherTokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            quantityOtherTokens
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
        IERC20(redeemToken).approve(address(router), uint256(-1));
        IERC20(otherTokenAddress).approve(address(router), uint256(-1));

        // Adds liquidity to Uniswap V2 Pair and returns liquidity shares to the "to" address.
        router.addLiquidity(
            redeemToken,
            otherTokenAddress,
            outputRedeems,
            quantityOtherTokens,
            minShortTokens,
            minOtherTokens,
            to,
            deadline
        );

        // Send longOptionTokens from minting option operation to msg.sender.
        IERC20(optionAddress).safeTransfer(msg.sender, outputOptions);
        return true;
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
        IUniswapV2Factory factory,
        IUniswapV2Router02 router,
        ITrader trader,
        address optionAddress,
        address otherTokenAddress,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) internal returns (uint256, uint256) {
        // Store in memory for gas savings.
        IOption optionToken = IOption(optionAddress);

        {
            // Gets the Uniswap V2 Pair address for optionAddress and otherToken.
            // Transfers the LP tokens for the pair to this contract.
            // Warning: internal call to a non-trusted address `msg.sender`.
            address pair = factory.getPair(optionAddress, otherTokenAddress);
            IERC20(pair).safeTransferFrom(msg.sender, address(this), liquidity);
            IERC20(pair).approve(address(router), uint256(-1));
        }

        // Remove liquidity from Uniswap V2 pool to receive pool tokens (option + quote tokens).
        (uint256 amountOptions, uint256 amountOtherTokens) = router
            .removeLiquidity(
            optionAddress,
            otherTokenAddress,
            liquidity,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        // Approves trader to pull longOptionTokens and shortOptionTOkens from this contract to close options.
        {
            address redeemToken = optionToken.redeemToken();
            IERC20(optionAddress).approve(address(trader), uint256(-1));
            IERC20(redeemToken).approve(address(trader), uint256(-1));

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
        trader.safeClose(optionToken, amountOptions, to);

        // Send the otherTokens received from burning liquidity shares to the "to" address.
        IERC20(otherTokenAddress).safeTransfer(to, amountOtherTokens);
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
        IUniswapV2Factory factory,
        IUniswapV2Router02 router,
        ITrader trader,
        address optionAddress,
        address otherTokenAddress,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) internal returns (uint256, uint256) {
        // Store in memory for gas savings.
        address redeemToken = IOption(optionAddress).redeemToken();

        {
            // Gets the Uniswap V2 Pair address for shortOptionToken and otherTokens.
            // Transfers the LP tokens for the pair to this contract.
            // Warning: internal call to a non-trusted address `msg.sender`.
            address pair = factory.getPair(redeemToken, otherTokenAddress);
            IERC20(pair).safeTransferFrom(msg.sender, address(this), liquidity);
            IERC20(pair).approve(address(router), uint256(-1));
        }

        // Remove liquidity from Uniswap V2 pool to receive pool tokens (shortOptionTokens + otherTokens).
        (uint256 amountShortOptions, uint256 amountOtherTokens) = router
            .removeLiquidity(
            redeemToken,
            otherTokenAddress,
            liquidity,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        // Approves trader to pull longOptionTokens and shortOptionTOkens from this contract to close options.
        {
            IOption optionToken = IOption(optionAddress);
            IERC20(address(optionToken)).approve(address(trader), uint256(-1));
            IERC20(redeemToken).approve(address(trader), uint256(-1));

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
            trader.safeClose(optionToken, requiredLongOptionTokens, to);
        }

        // Send the otherTokens received from burning liquidity shares to the "to" address.
        IERC20(otherTokenAddress).safeTransfer(to, amountOtherTokens);
        return (amountShortOptions, amountOtherTokens);
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
        IUniswapV2Router02 router,
        address tokenAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address to,
        uint256 deadline
    ) internal returns (uint256[] memory amounts, bool success) {
        // Fails early if the token being swapped from is not the optionToken.
        require(path[0] == tokenAddress, "ERR_PATH_OPTION_START");

        // Approve the uniswap router to be able to transfer longOptionTokens from this contract.
        IERC20(tokenAddress).approve(address(router), uint256(-1));
        // Call the Uniswap V2 function to swap longOptionTokens to quoteTokens.
        (amounts) = router.swapExactTokensForTokens(
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
        bytes memory data
    ) internal {
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
    function deployUniswapMarket(
        IUniswapV2Factory factory,
        address optionAddress,
        address otherToken
    ) internal returns (address) {
        address uniswapPair = factory.createPair(optionAddress, otherToken);
        return uniswapPair;
    }

    // ==== View ====
}
