pragma solidity >=0.6.0;

///
/// @title   Library for business logic for connecting Uniswap V2 Protocol functions with Primitive V1.
/// @notice  Primitive V1 UniswapConnectorLib02 - @primitivefi/contracts@v0.4.2
/// @author  Primitive
///

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
import { ITrader, IOption } from "../../option/interfaces/ITrader.sol";
import { TraderLib, IERC20 } from "../../option/libraries/TraderLib.sol";
import { IWethConnector01, IWETH } from "../WETH/IWethConnector01.sol";
import { WethConnectorLib01 } from "../WETH/WethConnectorLib01.sol";
// Open Zeppelin
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

library UniswapConnectorLib03 {
    using SafeERC20 for IERC20; // Reverts when `transfer` or `transferFrom` erc20 calls don't return proper data
    using SafeMath for uint256; // Reverts on math underflows/overflows

    /// ==== Combo Operations ====

    ///
    /// @dev Mints long + short option tokens, then swaps the longOptionTokens (option) for tokens.
    /// Combines Primitive "mintOptions" function with Uniswap V2 Router "swapExactTokensForTokens" function.
    /// @notice If the first address in the path is not the optionToken address, the tx will fail.
    /// underlyingToken -> optionToken -> quoteToken.
    /// @param optionToken The address of the Oracle-less Primitive option.
    /// @param amountIn The quantity of longOptionTokens to mint and then sell.
    /// @param amountOutMin The minimum quantity of tokens to receive in exchange for the longOptionTokens.
    /// @param path The token addresses to trade through using their Uniswap V2 pools. Assumes path[0] = option.
    /// @param to The address to send the optionToken proceeds and redeem tokens to.
    /// @param deadline The timestamp for a trade to fail at if not successful.
    /// @return bool Whether the transaction was successful or not.
    ///
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

    ///
    /// @dev Mints long + short option tokens, then swaps the shortOptionTokens (redeem) for tokens.
    /// @notice If the first address in the path is not the shortOptionToken address, the tx will fail.
    /// underlyingToken -> shortOptionToken -> quoteToken.
    /// IMPORTANT: redeemTokens = shortOptionTokens
    /// @param optionToken The address of the Option contract.
    /// @param amountIn The quantity of options to mint.
    /// @param amountOutMin The minimum quantity of tokens to receive in exchange for the shortOptionTokens.
    /// @param path The token addresses to trade through using their Uniswap V2 pools. Assumes path[0] = shortOptionToken.
    /// @param to The address to send the shortOptionToken proceeds and longOptionTokens to.
    /// @param deadline The timestamp for a trade to fail at if not successful.
    /// @return bool Whether the transaction was successful or not.
    ///
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

    // ==== Liquidity Functions ====

    ///
    /// @dev Adds liquidity to an option<>token pair by minting longOptionTokens with underlyingTokens.
    /// @notice Pulls underlying tokens from msg.sender and pushes UNI-V2 liquidity tokens to the "to" address.
    /// underlyingToken -> optionToken -> UNI-V2.
    /// @param optionAddress The address of the optionToken to mint then provide liquidity for.
    /// @param otherTokenAddress The address of the otherToken in the pair with the optionToken.
    /// @param quantityOptions The quantity of underlyingTokens to use to mint longOptionTokens.
    /// @param quantityOtherTokens The quantity of otherTokens to add with longOptionTokens to the Uniswap V2 Pair.
    /// @param minOptionTokens IMPORTANT: MUST BE EQUAL TO QUANTITYOPTIONS. The minimum quantity of longOptionTokens expected to provide liquidity with.
    /// @param minOtherTokens The minimum quantity of otherTokens expected to provide liquidity with.
    /// @param to The address that receives UNI-V2 shares.
    /// @param deadline The timestamp to expire a pending transaction.
    ///
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
        IERC20(otherTokenAddress).safeTransfer(
            msg.sender,
            IERC20(otherTokenAddress).balanceOf(address(this))
        );
        return true;
    }

    ///
    /// @dev Adds liquidity to an option<>token pair by minting longOptionTokens with underlyingTokens.
    /// @notice Pulls underlying tokens from msg.sender and pushes UNI-V2 liquidity tokens to the "to" address.
    /// underlyingToken -> optionToken -> UNI-V2.
    /// @param optionAddress The address of the optionToken to mint then provide liquidity for.
    /// @param otherTokenAddress The address of the otherToken in the pair with the optionToken.
    /// @param quantityOtherTokens The quantity of otherTokens to add with longOptionTokens to the Uniswap V2 Pair.
    /// @param minOptionTokens The minimum quantity of longOptionTokens expected to provide liquidity with.
    /// @param minOtherTokens The minimum quantity of otherTokens expected to provide liquidity with.
    /// @param to The address that receives UNI-V2 shares.
    /// @param deadline The timestamp to expire a pending transaction.
    ///
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
        (uint256 outputOptions, uint256 outputRedeems) = WethConnectorLib01
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

    ///
    /// @dev Adds redeemToken liquidity to a redeem<>otherToken pair by minting shortOptionTokens with underlyingTokens.
    /// @notice Pulls underlying tokens from msg.sender and pushes UNI-V2 liquidity tokens to the "to" address.
    /// underlyingToken -> redeemToken -> UNI-V2.
    /// @param optionAddress The address of the optionToken to get the redeemToken to mint then provide liquidity for.
    /// @param otherTokenAddress The address of the otherToken in the pair with the optionToken.
    /// @param quantityOptions The quantity of underlyingTokens to use to mint option + redeem tokens.
    /// @param quantityOtherTokens The quantity of otherTokens to add with shortOptionTokens to the Uniswap V2 Pair.
    /// @param minShortTokens The minimum quantity of shortOptionTokens expected to provide liquidity with.
    /// @param minOtherTokens The minimum quantity of otherTokens expected to provide liquidity with.
    /// @param to The address that receives UNI-V2 shares.
    /// @param deadline The timestamp to expire a pending transaction.
    ///
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
        IERC20(otherTokenAddress).safeTransfer(
            msg.sender,
            IERC20(otherTokenAddress).balanceOf(address(this))
        );
        return true;
    }

    ///
    /// @dev Combines Uniswap V2 Router "removeLiquidity" function with Primitive "closeOptions" function.
    /// @notice Pulls UNI-V2 liquidity shares with option<>other token, and redeemTokens from msg.sender.
    /// Then closes the longOptionTokens and withdraws underlyingTokens to the "to" address.
    /// Sends otherTokens from the burned UNI-V2 liquidity shares to the "to" address.
    /// UNI-V2 -> optionToken -> underlyingToken.
    /// @param optionAddress The address of the option that will be closed from burned UNI-V2 liquidity shares.
    /// @param otherTokenAddress The address of the other token in the pair with the options.
    /// @param liquidity The quantity of liquidity tokens to pull from msg.sender and burn.
    /// @param amountAMin The minimum quantity of longOptionTokens to receive from removing liquidity.
    /// @param amountBMin The minimum quantity of otherTokens to receive from removing liquidity.
    /// @param to The address that receives otherTokens from burned UNI-V2, and underlyingTokens from closed options.
    /// @param deadline The timestamp to expire a pending transaction.
    ///
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

    ///
    /// @dev Combines Uniswap V2 Router "removeLiquidity" function with Primitive "closeOptions" function.
    /// @notice Pulls UNI-V2 liquidity shares with shortOption<>quote token, and optionTokens from msg.sender.
    /// Then closes the longOptionTokens and withdraws underlyingTokens to the "to" address.
    /// Sends quoteTokens from the burned UNI-V2 liquidity shares to the "to" address.
    /// UNI-V2 -> optionToken -> underlyingToken.
    /// @param optionAddress The address of the option that will be closed from burned UNI-V2 liquidity shares.
    /// @param otherTokenAddress The address of the other token in the option pair.
    /// @param liquidity The quantity of liquidity tokens to pull from msg.sender and burn.
    /// @param amountAMin The minimum quantity of shortOptionTokens to receive from removing liquidity.
    /// @param amountBMin The minimum quantity of quoteTokens to receive from removing liquidity.
    /// @param to The address that receives quoteTokens from burned UNI-V2, and underlyingTokens from closed options.
    /// @param deadline The timestamp to expire a pending transaction.
    ///
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

    // ==== Flash Functions ====

    ///
    /// @dev Receives underlyingTokens from a UniswapV2Pair.swap() call from a pair with
    /// reserve0 = shortOptionTokens and reserve1 = underlyingTokens.
    /// Uses underlyingTokens to mint long (option) + short (redeem) tokens.
    /// Sends longOptionTokens to msg.sender, and pays back the UniswapV2Pair the shortOptionTokens,
    /// AND any remainder quantity of underlyingTokens (paid by msg.sender).
    /// @notice If the first address in the path is not the shortOptionToken address, the tx will fail.
    /// @param router The address of the UniswapV2Router02 contract.
    /// @param pairAddress The address of the redeemToken<>underlyingToken UniswapV2Pair contract.
    /// @param optionAddress The address of the Option contract.
    /// @param flashLoanQuantity The quantity of options to mint using borrowed underlyingTokens.
    /// @param maxPremium The maximum quantity of underlyingTokens to pay for the optionTokens.
    /// @param path The token addresses to trade through using their Uniswap V2 pools. Assumes path[0] = shortOptionToken.
    /// @param to The address to send the shortOptionToken proceeds and longOptionTokens to.
    /// @return success bool Whether the transaction was successful or not.
    ///
    function flashMintShortOptionsThenSwap(
        IUniswapV2Router02 router,
        address pairAddress,
        address optionAddress,
        uint256 flashLoanQuantity,
        uint256 maxPremium,
        address[] memory path,
        address to
    ) internal returns (uint256, uint256) {
        require(msg.sender == address(this), "ERR_NOT_SELF");
        require(flashLoanQuantity > 0, "ERR_ZERO");
        // IMPORTANT: Assume this contract has already received `flashLoanQuantity` of underlyingTokens.
        // We are flash swapping from an underlying <> shortOptionToken pair, paying back a portion using minted shortOptionTokens
        // and any remainder of underlyingToken.

        uint256 outputOptions; // quantity of longOptionTokens minted
        uint256 outputRedeems; // quantity of shortOptionTokens minted

        address underlyingToken = IOption(optionAddress)
            .getUnderlyingTokenAddress();
        require(path[1] == underlyingToken, "ERR_END_PATH_NOT_UNDERLYING");

        // Mint longOptionTokens using the underlyingTokens received from UniswapV2 flash swap to this contract.
        // Send underlyingTokens from this contract to the optionToken contract, then call mintOptions.
        IERC20(underlyingToken).safeTransfer(optionAddress, flashLoanQuantity);
        (outputOptions, outputRedeems) = IOption(optionAddress).mintOptions(
            address(this)
        );

        // The loanRemainder will be the amount of underlyingTokens that are needed from the original
        // transaction caller in order to pay the flash swap.
        // IMPORTANT: THIS IS EFFECTIVELY THE PREMIUM PAID IN UNDERLYINGTOKENS TO PURCHASE THE OPTIONTOKEN.
        uint256 loanRemainder;

        // Economically, negativePremiumPaymentInRedeems value should always be 0.
        // In the case that we minted more redeemTokens than are needed to pay back the flash swap,
        // (short -> underlying is a positive trade), there is an effective negative premium.
        // In that case, this function will send out `negativePremiumAmount` of redeemTokens to the original caller.
        // This means the user gets to keep the extra redeemTokens for free.
        // Negative premium amount is the opposite difference of the loan remainder: (paid - flash loan amount)
        uint256 negativePremiumPaymentInRedeems;

        // Need to return tokens from the flash swap by returning shortOptionTokens and any remainder of underlyingTokens.
        {
            // scope for router, avoids stack too deep errors
            IUniswapV2Router02 router_ = router;
            // Since the borrowed amount is underlyingTokens, and we are paying back in redeemTokens,
            // we need to see how much redeemTokens must be returned for the borrowed amount.
            // We can find that value by doing the normal swap math, getAmountsIn will give us the amount
            // of redeemTokens are needed for the output amount of the flash loan.
            // IMPORTANT: amountsIn 0 is how many short tokens we need to pay back.
            // This value is most likely greater than the amount of redeemTokens minted.
            uint256[] memory amountsIn = router_.getAmountsIn(
                flashLoanQuantity,
                path
            );

            uint256 redeemsRequired = amountsIn[0]; // the amountIn of redeemTokens based on the amountOut of flashloanQuantity
            // If outputRedeems is greater than redeems required, we have a negative premium.
            uint256 redeemCostRemaining = redeemsRequired > outputRedeems
                ? redeemsRequired.sub(outputRedeems)
                : 0;
            // If there is a negative premium, calculate the quantity extra redeemTokens.
            negativePremiumPaymentInRedeems = outputRedeems > redeemsRequired
                ? outputRedeems.sub(redeemsRequired)
                : 0;

            // In most cases, there will be an outstanding cost (assuming we minted less redeemTokens than the
            // required amountIn of redeemTokens for the swap).
            if (redeemCostRemaining > 0) {
                // The user won't want to pay back the remaining cost in redeemTokens,
                // because they borrowed underlyingTokens to mint them in the first place.
                // So instead, we get the quantity of underlyingTokens that could be paid instead.
                // We can calculate this using normal swap math.
                // getAmountsOut will return the quantity of underlyingTokens that are output,
                // based on some input of redeemTokens.
                // The input redeemTokens is the remaining redeemToken cost, and the output
                // underlyingTokens is the proportional amount of underlyingTokens.
                // amountsOut[1] is then the outstanding flash loan value denominated in underlyingTokens.
                address[] memory path_ = path;
                uint256[] memory amountsOut = router_.getAmountsOut(
                    redeemCostRemaining,
                    path_
                );

                // should investigate further, needs to consider a 0.101% fee?
                // Without a 0.101% fee, amountsOut[1] is not enough.
                loanRemainder = amountsOut[1]
                    .mul(100101)
                    .add(amountsOut[1])
                    .div(100000);
            }

            // In the case that more redeemTokens were minted than need to be sent back as payment,
            // calculate the new outputRedeem value to send to the pair
            // (don't send all the minted redeemTokens).
            if (negativePremiumPaymentInRedeems > 0) {
                outputRedeems = outputRedeems.sub(
                    negativePremiumPaymentInRedeems
                );
            }
        }

        {
            // scope for redeemToken and underlyingToken, avoids stack too deep errors
            address redeemToken = IOption(optionAddress).redeemToken();
            // Pay back the pair in redeemTokens (shortOptionTokens)
            IERC20(redeemToken).safeTransfer(pairAddress, outputRedeems);

            // If loanRemainder is non-zero and non-negative, send underlyingTokens to the pair as payment (premium).
            if (loanRemainder > 0) {
                // Pull underlyingTokens from the original msg.sender to pay the remainder of the flash swap.
                require(loanRemainder >= maxPremium, "ERR_PREMIUM_OVER_MAX");
                IERC20(underlyingToken).safeTransferFrom(
                    to,
                    pairAddress,
                    loanRemainder
                );
            }

            // If negativePremiumAmount is non-zero and non-negative, send it to the `to` address.
            if (negativePremiumPaymentInRedeems > 0) {
                IERC20(redeemToken).safeTransfer(
                    to,
                    negativePremiumPaymentInRedeems
                );
            }
        }
        // Send longOptionTokens (option) to the original msg.sender.
        IERC20(optionAddress).safeTransfer(to, outputOptions);
        return (outputOptions, loanRemainder);
    }

    /// @dev Sends shortOptionTokens to msg.sender, and pays back the UniswapV2Pair in underlyingTokens.
    /// @notice IMPORTANT: If minPayout is 0, the `to` address is liable for negative payouts *if* that occurs.
    /// @param router The UniswapV2Router02 contract.
    /// @param pairAddress The address of the redeemToken<>underlyingToken UniswapV2Pair contract.
    /// @param optionAddress The address of the longOptionTokes to close.
    /// @param flashLoanQuantity The quantity of shortOptionTokens borrowed to use to close longOptionTokens.
    /// @param minPayout The minimum payout of underlyingTokens sent to the `to` address.
    /// @param path underlyingTokens -> shortOptionTokens, because we are paying the input of underlyingTokens.
    /// @param to The address which is sent the underlyingToken payout, or liable to pay for a negative payout.
    function flashCloseLongOptionsThenSwap(
        IUniswapV2Router02 router,
        address pairAddress,
        address optionAddress,
        uint256 flashLoanQuantity,
        uint256 minPayout,
        address[] memory path,
        address to
    ) internal returns (uint256, uint256) {
        require(msg.sender == address(this), "ERR_NOT_SELF");
        require(flashLoanQuantity > 0, "ERR_ZERO");
        // IMPORTANT: Assume this contract has already received `flashLoanQuantity` of redeemTokens.
        // We are flash swapping from an underlying <> shortOptionToken pair,
        // paying back a portion using underlyingTokens received from closing options.
        // In the flash open, we did redeemTokens to underlyingTokens.
        // In the flash close (this function), we are doing underlyingTokens to redeemTokens and keeping the remainder.

        address underlyingToken = IOption(optionAddress)
            .getUnderlyingTokenAddress();
        address redeemToken = IOption(optionAddress).redeemToken();
        require(path[1] == redeemToken, "ERR_END_PATH_NOT_REDEEM");

        // Close longOptionTokens using the redeemTokens received from UniswapV2 flash swap to this contract.
        // Send underlyingTokens from this contract to the optionToken contract, then call mintOptions.
        IERC20(redeemToken).safeTransfer(optionAddress, flashLoanQuantity);
        uint256 requiredOptions = flashLoanQuantity
            .mul(IOption(optionAddress).getBaseValue())
            .div(IOption(optionAddress).getQuoteValue());

        // Send out the required amount of options from the original caller.
        // WARNING: CALLS TO UNTRUSTED ADDRESS.
        IERC20(optionAddress).safeTransferFrom(
            to,
            optionAddress,
            requiredOptions
        );
        (, , uint256 outputUnderlyings) = IOption(optionAddress).closeOptions(
            address(this)
        );

        // Need to return tokens from the flash swap by returning underlyingTokens.
        {
            address pairAddress_ = pairAddress;
            address underlyingToken_ = underlyingToken;
            // Since the borrowed amount is redeemTokens, and we are paying back in underlyingTokens,
            // we need to see how much underlyingTokens must be returned for the borrowed amount.
            // We can find that value by doing the normal swap math, getAmountsIn will give us the amount
            // of underlyingTokens are needed for the output amount of the flash loan.
            // IMPORTANT: amountsIn 0 is how many underlyingTokens we need to pay back.
            // This value is most likely greater than the amount of underlyingTokens received from closing.
            uint256[] memory amountsIn = router.getAmountsIn(
                flashLoanQuantity,
                path
            );

            // The loanRemainder will be the amount of underlyingTokens that are needed from the original
            // transaction caller in order to pay the flash swap.
            // IMPORTANT: THIS IS EFFECTIVELY THE PREMIUM PAID IN UNDERLYINGTOKENS TO PURCHASE THE OPTIONTOKEN.
            uint256 loanRemainder;

            // Economically, underlyingPayout value should always be greater than 0, or this trade shouldn't be made.
            // If an underlyingPayout is greater than 0, it means that the redeemTokens borrowed are worth less than the
            // underlyingTokens received from closing the redeemToken<>optionTokens.
            // If the redeemTokens are worth more than the underlyingTokens they are entitled to,
            // then closing the redeemTokens will cost additional underlyingTokens. In this case,
            // the transaction should be reverted. Or else, the user is paying extra at the expense of
            // rebalancing the pool.
            uint256 underlyingPayout;
            {
                uint256 underlyingsRequired = amountsIn[0]; // the amountIn required of underlyingTokens based on the amountOut of flashloanQuantity
                // If outputUnderlyings (received from closing) is greater than underlyings required,
                // there is a positive payout.
                underlyingPayout = outputUnderlyings > underlyingsRequired
                    ? outputUnderlyings.sub(underlyingsRequired)
                    : 0;

                // If there is a negative payout, calculate the remaining cost of underlyingTokens.
                uint256 underlyingCostRemaining = underlyingsRequired >
                    outputUnderlyings
                    ? underlyingsRequired.sub(outputUnderlyings)
                    : 0;

                {
                    // In the case that there is a negative payout (additional underlyingTokens are required),
                    // get the remaining cost into the `loanRemainder` variable and also check to see
                    // if a user is willing to pay the negative cost. There is no rational economic incentive for this.
                    if (underlyingCostRemaining > 0) {
                        loanRemainder = underlyingCostRemaining;
                    }

                    // In the case that the payment is positive, subtract it from the outputUnderlyings.
                    // outputUnderlyings = underlyingsRequired, which is being paid back to the pair.
                    if (underlyingPayout > 0) {
                        outputUnderlyings = outputUnderlyings.sub(
                            underlyingPayout
                        );
                    }
                }
            }

            // Pay back the pair in underlyingTokens
            IERC20(underlyingToken_).safeTransfer(
                pairAddress_,
                outputUnderlyings
            );

            // If loanRemainder is non-zero and non-negative, send underlyingTokens to the pair as payment (premium).
            if (loanRemainder > 0) {
                // Pull underlyingTokens from the original msg.sender to pay the remainder of the flash swap.
                // Revert if the minPayout is less than or equal to the underlyingPayment of 0.
                // There is 0 underlyingPayment in the case that loanRemainder > 0.
                // This code branch can be successful by setting `minPayout` to 0.
                // This means the user is willing to pay to close the position.
                require(minPayout <= underlyingPayout, "ERR_NEGATIVE_PAYOUT");
                IERC20(underlyingToken_).safeTransferFrom(
                    to,
                    pairAddress_,
                    loanRemainder
                );
            }

            // If underlyingPayout is non-zero and non-negative, send it to the `to` address.
            if (underlyingPayout > 0) {
                // Revert if minPayout is less than the actual payout.
                require(underlyingPayout >= minPayout, "ERR_PREMIUM_UNDER_MIN");
                IERC20(underlyingToken_).safeTransfer(to, underlyingPayout);
            }

            return (outputUnderlyings, underlyingPayout);
        }
    }

    // ==== Internal Functions ====

    ///
    /// @dev Calls the "swapExactTokensForTokens" function on the Uniswap V2 Router 02 Contract.
    /// @notice Fails early if the address in the beginning of the path is not the token address.
    /// @param tokenAddress The address of the token to swap from.
    /// @param amountIn The quantity of longOptionTokens to swap with.
    /// @param amountOutMin The minimum quantity of tokens to receive in exchange for the tokens swapped.
    /// @param path The token addresses to trade through using their Uniswap V2 pairs.
    /// @param to The address to send the token proceeds to.
    /// @param deadline The timestamp for a trade to fail at if not successful.
    ///
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
}
