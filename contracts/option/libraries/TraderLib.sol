// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

/**
 * @title   Trader Library
 * @notice  Internal functions that can be used to safeTransfer
 *          tokens into the option contract then call respective option contract functions.
 * @author  Primitive
 */

import { IOption } from "../interfaces/IOption.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

library TraderLib {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @dev Conducts important safety checks to safely mint option tokens.
     * @param optionToken The address of the option token to mint.
     * @param mintQuantity The quantity of option tokens to mint.
     * @param receiver The address which receives the minted option tokens.
     */
    function safeMint(
        IOption optionToken,
        uint256 mintQuantity,
        address receiver
    ) internal returns (uint256, uint256) {
        require(mintQuantity > 0, "ERR_ZERO");
        IERC20(optionToken.getUnderlyingTokenAddress()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            mintQuantity
        );
        (uint256 outputOptions, uint256 outputRedeems) = optionToken
            .mintOptions(receiver);
        return (outputOptions, outputRedeems);
    }

    /**
     * @dev Swaps strikeTokens to underlyingTokens using the strike ratio as the exchange rate.
     * @notice Burns optionTokens, option contract receives strikeTokens, user receives underlyingTokens.
     * @param optionToken The address of the option contract.
     * @param exerciseQuantity Quantity of optionTokens to exercise.
     * @param receiver The underlyingTokens are sent to the receiver address.
     */
    function safeExercise(
        IOption optionToken,
        uint256 exerciseQuantity,
        address receiver
    ) internal returns (uint256, uint256) {
        require(exerciseQuantity > 0, "ERR_ZERO");
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >=
                exerciseQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate quantity of strikeTokens needed to exercise quantity of optionTokens.
        uint256 inputStrikes = exerciseQuantity
            .mul(optionToken.getQuoteValue())
            .div(optionToken.getBaseValue());
        require(
            IERC20(optionToken.getStrikeTokenAddress()).balanceOf(msg.sender) >=
                inputStrikes,
            "ERR_BAL_STRIKE"
        );
        IERC20(optionToken.getStrikeTokenAddress()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inputStrikes
        );
        IERC20(address(optionToken)).safeTransferFrom(
            msg.sender,
            address(optionToken),
            exerciseQuantity
        );

        uint256 inputOptions;
        (inputStrikes, inputOptions) = optionToken.exerciseOptions(
            receiver,
            exerciseQuantity,
            new bytes(0)
        );
        return (inputStrikes, inputOptions);
    }

    /**
     * @dev Burns redeemTokens to withdraw available strikeTokens.
     * @notice inputRedeems = outputStrikes.
     * @param optionToken The address of the option contract.
     * @param redeemQuantity redeemQuantity of redeemTokens to burn.
     * @param receiver The strikeTokens are sent to the receiver address.
     */
    function safeRedeem(
        IOption optionToken,
        uint256 redeemQuantity,
        address receiver
    ) internal returns (uint256) {
        require(redeemQuantity > 0, "ERR_ZERO");
        require(
            IERC20(optionToken.redeemToken()).balanceOf(msg.sender) >=
                redeemQuantity,
            "ERR_BAL_REDEEM"
        );
        // There can be the case there is no available strikes to redeem, causing a revert.
        IERC20(optionToken.redeemToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            redeemQuantity
        );
        uint256 inputRedeems = optionToken.redeemStrikeTokens(receiver);
        return inputRedeems;
    }

    /**
     * @dev Burn optionTokens and redeemTokens to withdraw underlyingTokens.
     * @notice The redeemTokens to burn is equal to the optionTokens * strike ratio.
     * inputOptions = inputRedeems / strike ratio = outUnderlyings
     * @param optionToken The address of the option contract.
     * @param closeQuantity Quantity of optionTokens to burn.
     * (Implictly will burn the strike ratio quantity of redeemTokens).
     * @param receiver The underlyingTokens are sent to the receiver address.
     */
    function safeClose(
        IOption optionToken,
        uint256 closeQuantity,
        address receiver
    )
        internal
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        require(closeQuantity > 0, "ERR_ZERO");
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >= closeQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate the quantity of redeemTokens that need to be burned. (What we mean by Implicit).
        uint256 inputRedeems = closeQuantity
            .mul(optionToken.getQuoteValue())
            .div(optionToken.getBaseValue());
        require(
            IERC20(optionToken.redeemToken()).balanceOf(msg.sender) >=
                inputRedeems,
            "ERR_BAL_REDEEM"
        );
        IERC20(optionToken.redeemToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inputRedeems
        );
        IERC20(address(optionToken)).safeTransferFrom(
            msg.sender,
            address(optionToken),
            closeQuantity
        );

        uint256 inputOptions;
        uint256 outUnderlyings;
        (inputRedeems, inputOptions, outUnderlyings) = optionToken.closeOptions(
            receiver
        );
        return (inputRedeems, inputOptions, outUnderlyings);
    }

    /**
     * @dev Burn redeemTokens to withdraw underlyingTokens and strikeTokens from expired options.
     * @param optionToken The address of the option contract.
     * @param unwindQuantity Quantity of option tokens used to calculate the amount of redeem tokens to burn.
     * @param receiver The underlyingTokens are sent to the receiver address and the redeemTokens are burned.
     */
    function safeUnwind(
        IOption optionToken,
        uint256 unwindQuantity,
        address receiver
    )
        internal
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        // Checks
        require(unwindQuantity > 0, "ERR_ZERO");
        // solhint-disable-next-line not-rely-on-time
        require(
            optionToken.getExpiryTime() < block.timestamp,
            "ERR_NOT_EXPIRED"
        );

        // Calculate amount of redeems required
        uint256 inputRedeems = unwindQuantity
            .mul(optionToken.getQuoteValue())
            .div(optionToken.getBaseValue());
        require(
            IERC20(optionToken.redeemToken()).balanceOf(msg.sender) >=
                inputRedeems,
            "ERR_BAL_REDEEM"
        );
        IERC20(optionToken.redeemToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inputRedeems
        );

        uint256 inputOptions;
        uint256 outUnderlyings;
        (inputRedeems, inputOptions, outUnderlyings) = optionToken.closeOptions(
            receiver
        );

        return (inputRedeems, inputOptions, outUnderlyings);
    }
}
