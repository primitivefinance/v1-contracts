// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

/**
 * @title   Trader
 * @notice  Abstracts the interfacing with the protocol's option contract for ease-of-use.
 * @author  Primitive
 */

import { IOption } from "../interfaces/IOption.sol";
import { ITrader } from "../interfaces/ITrader.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { TraderLib } from "../libraries/TraderLib.sol";

contract Trader is ITrader, ReentrancyGuard {
    using SafeMath for uint256;

    address payable public weth;

    event TraderMint(
        address indexed from,
        address indexed option,
        uint256 outputOptions,
        uint256 outputRedeems
    );
    event TraderExercise(
        address indexed from,
        address indexed option,
        uint256 outUnderlyings,
        uint256 inStrikes
    );
    event TraderRedeem(
        address indexed from,
        address indexed option,
        uint256 inRedeems
    );
    event TraderClose(
        address indexed from,
        address indexed option,
        uint256 inOptions
    );

    event TraderUnwind(
        address indexed from,
        address indexed option,
        uint256 inOptions
    );

    constructor(address payable _weth) public {
        weth = _weth;
    }

    /**
     * @dev Mint options at a 1:1 ratio with deposited underlying tokens.
     * @notice Also mints redeems at a strike ratio to the deposited underlyings.
     * Warning: Calls msg.sender with safeTransferFrom.
     * @param optionToken The address of the option contract.
     * @param mintQuantity Quantity of options to mint and underlyingToken to deposit.
     * @param receiver The newly minted options and redeems are sent to the receiver address.
     */
    function safeMint(
        IOption optionToken,
        uint256 mintQuantity,
        address receiver
    ) external override nonReentrant returns (uint256, uint256) {
        (uint256 outputOptions, uint256 outputRedeems) = TraderLib.safeMint(
            optionToken,
            mintQuantity,
            receiver
        );
        emit TraderMint(
            msg.sender,
            address(optionToken),
            outputOptions,
            outputRedeems
        );
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
    ) external override nonReentrant returns (uint256, uint256) {
        (uint256 inStrikes, uint256 inOptions) = TraderLib.safeExercise(
            optionToken,
            exerciseQuantity,
            receiver
        );
        emit TraderExercise(
            msg.sender,
            address(optionToken),
            exerciseQuantity,
            inStrikes
        );

        return (inStrikes, inOptions);
    }

    /**
     * @dev Burns redeemTokens to withdraw available strikeTokens.
     * @notice inRedeems = outStrikes.
     * @param optionToken The address of the option contract.
     * @param redeemQuantity redeemQuantity of redeemTokens to burn.
     * @param receiver The strikeTokens are sent to the receiver address.
     */
    function safeRedeem(
        IOption optionToken,
        uint256 redeemQuantity,
        address receiver
    ) external override nonReentrant returns (uint256) {
        uint256 inRedeems = TraderLib.safeRedeem(
            optionToken,
            redeemQuantity,
            receiver
        );
        emit TraderRedeem(msg.sender, address(optionToken), inRedeems);
        return inRedeems;
    }

    /**
     * @dev Burn optionTokens and redeemTokens to withdraw underlyingTokens.
     * @notice The redeemTokens to burn is equal to the optionTokens * strike ratio.
     * inOptions = inRedeems / strike ratio = outUnderlyings
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
        external
        override
        nonReentrant
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        (
            uint256 inRedeems,
            uint256 inOptions,
            uint256 outUnderlyings
        ) = TraderLib.safeClose(optionToken, closeQuantity, receiver);
        emit TraderClose(msg.sender, address(optionToken), inOptions);
        return (inRedeems, inOptions, outUnderlyings);
    }

    /**
     * @dev Burn redeemTokens to withdraw underlyingTokens and strikeTokens from expired options.
     * @param optionToken The address of the option contract.
     * @param unwindQuantity Quantity of option tokens used to calculate the amount of redeem tokens to burn.
     * @param receiver The underlyingTokens and redeemTokens are sent to the receiver address.
     */
    function safeUnwind(
        IOption optionToken,
        uint256 unwindQuantity,
        address receiver
    )
        external
        override
        nonReentrant
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        (
            uint256 inRedeems,
            uint256 inOptions,
            uint256 outUnderlyings
        ) = TraderLib.safeUnwind(optionToken, unwindQuantity, receiver);
        emit TraderUnwind(msg.sender, address(optionToken), inOptions);
        return (inRedeems, inOptions, outUnderlyings);
    }
}
