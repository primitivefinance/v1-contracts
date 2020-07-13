// SPDX-License-Identifier: MIT





pragma solidity ^0.6.2;

/**
 * @title   Trader Library
 * @notice  Internal functions that can be used to safeTransfer
 *          tokens into the option contract then call respective option contractfunctions.
 * @author  Primitive
 */

import { IOption } from "../interfaces/IOption.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

library TraderLib {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    function safeMint(
        IOption optionToken,
        uint256 mintQuantity,
        address receiver
    ) internal returns (uint256 outputOptions, uint256 outputRedeem) {
        require(mintQuantity > 0, "ERR_ZERO");
        IERC20(optionToken.underlyingToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            mintQuantity
        );
        (outputOptions, outputRedeem) = optionToken.mint(receiver);
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
    ) internal returns (uint256 inputStrikes, uint256 inputOptions) {
        require(exerciseQuantity > 0, "ERR_ZERO");
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >=
                exerciseQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate quantity of strikeTokens needed to exercise quantity of optionTokens.
        inputStrikes = exerciseQuantity
            .add(exerciseQuantity.div(IOption(optionToken).EXERCISE_FEE()))
            .mul(optionToken.quote())
            .div(optionToken.base());
        require(
            IERC20(optionToken.strikeToken()).balanceOf(msg.sender) >=
                inputStrikes,
            "ERR_BAL_STRIKE"
        );
        IERC20(optionToken.strikeToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inputStrikes
        );
        IERC20(address(optionToken)).safeTransferFrom(
            msg.sender,
            address(optionToken),
            exerciseQuantity
        );
        (inputStrikes, inputOptions) = optionToken.exercise(
            receiver,
            exerciseQuantity,
            new bytes(0)
        );
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
    ) internal returns (uint256 inputRedeems) {
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
        (inputRedeems) = optionToken.redeem(receiver);
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
            uint256 inputRedeems,
            uint256 inputOptions,
            uint256 outUnderlyings
        )
    {
        require(closeQuantity > 0, "ERR_ZERO");
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >= closeQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate the quantity of redeemTokens that need to be burned. (What we mean by Implicit).
        inputRedeems = closeQuantity.mul(optionToken.quote()).div(
            optionToken.base()
        );
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
        (inputRedeems, inputOptions, outUnderlyings) = optionToken.close(
            receiver
        );
    }

    /**
     * @dev Burn redeemTokens to withdraw underlyingTokens and strikeTokens from expired options.
     * @param optionToken The address of the option contract.
     * @param unwindQuantity Quantity of redeemTokens to burn.
     * @param receiver The underlyingTokens and redeemTokens are sent to the receiver address.
     */
    function safeUnwind(
        IOption optionToken,
        uint256 unwindQuantity,
        address receiver
    )
        internal
        returns (
            uint256 inputRedeems,
            uint256 inputOptions,
            uint256 outUnderlyings
        )
    {
        // Checks
        require(unwindQuantity > 0, "ERR_ZERO");
        // solhint-disable-next-line not-rely-on-time
        require(optionToken.expiry() < block.timestamp, "ERR_NOT_EXPIRED");

        // Calculate amount of redeems required
        inputRedeems = unwindQuantity.mul(optionToken.quote()).div(
            optionToken.base()
        );
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
        (inputRedeems, inputOptions, outUnderlyings) = optionToken.close(
            receiver
        );
    }
}
