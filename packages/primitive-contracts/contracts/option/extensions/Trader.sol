// SPDX-License-Identifier: MIT







pragma solidity ^0.6.2;

/**
 * @title   Trader
 * @notice  Abstracts the interfacing with the protocol's option contract for ease-of-use.
 * @author  Primitive
 */

import { IOption } from "../interfaces/IOption.sol";
import { ITrader } from "../interfaces/ITrader.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Trader is ITrader, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address payable public weth;

    event TraderMint(
        address indexed from,
        address indexed option,
        uint256 outOptions,
        uint256 outRedeems
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
    )
        external
        override
        nonReentrant
        returns (uint256 outOptions, uint256 outRedeems)
    {
        require(mintQuantity > 0, "ERR_ZERO");
        IERC20(optionToken.underlyingToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            mintQuantity
        );
        (outOptions, outRedeems) = optionToken.mint(receiver);
        emit TraderMint(
            msg.sender,
            address(optionToken),
            outOptions,
            outRedeems
        );
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
    )
        external
        override
        nonReentrant
        returns (uint256 inStrikes, uint256 inOptions)
    {
        require(exerciseQuantity > 0, "ERR_ZERO");
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >=
                exerciseQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate quantity of strikeTokens needed to exercise quantity of optionTokens.
        inStrikes = exerciseQuantity
            .add(exerciseQuantity.div(IOption(optionToken).EXERCISE_FEE()))
            .mul(optionToken.quote())
            .div(optionToken.base());
        require(
            IERC20(optionToken.strikeToken()).balanceOf(msg.sender) >=
                inStrikes,
            "ERR_BAL_STRIKE"
        );
        IERC20(optionToken.strikeToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inStrikes
        );
        IERC20(address(optionToken)).safeTransferFrom(
            msg.sender,
            address(optionToken),
            exerciseQuantity
        );
        (inStrikes, inOptions) = optionToken.exercise(
            receiver,
            exerciseQuantity,
            new bytes(0)
        );
        emit TraderExercise(
            msg.sender,
            address(optionToken),
            exerciseQuantity,
            inStrikes
        );
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
    ) external override nonReentrant returns (uint256 inRedeems) {
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
        (inRedeems) = optionToken.redeem(receiver);
        emit TraderRedeem(msg.sender, address(optionToken), inRedeems);
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
            uint256 inRedeems,
            uint256 inOptions,
            uint256 outUnderlyings
        )
    {
        require(closeQuantity > 0, "ERR_ZERO");
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >= closeQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate the quantity of redeemTokens that need to be burned. (What we mean by Implicit).
        inRedeems = closeQuantity.mul(optionToken.quote()).div(
            optionToken.base()
        );
        require(
            IERC20(optionToken.redeemToken()).balanceOf(msg.sender) >=
                inRedeems,
            "ERR_BAL_REDEEM"
        );
        IERC20(optionToken.redeemToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inRedeems
        );
        IERC20(address(optionToken)).safeTransferFrom(
            msg.sender,
            address(optionToken),
            closeQuantity
        );
        (inRedeems, inOptions, outUnderlyings) = optionToken.close(receiver);
        emit TraderClose(msg.sender, address(optionToken), inOptions);
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
        external
        override
        nonReentrant
        returns (
            uint256 inRedeems,
            uint256 inOptions,
            uint256 outUnderlyings
        )
    {
        require(unwindQuantity > 0, "ERR_ZERO");
        require(optionToken.expiry() < block.timestamp, "ERR_NOT_EXPIRED");
        inRedeems = unwindQuantity.mul(optionToken.quote()).div(
            optionToken.base()
        );
        require(
            IERC20(optionToken.redeemToken()).balanceOf(msg.sender) >=
                inRedeems,
            "ERR_BAL_REDEEM"
        );
        IERC20(optionToken.redeemToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inRedeems
        );
        (inRedeems, inOptions, outUnderlyings) = optionToken.close(receiver);
        emit TraderUnwind(msg.sender, address(optionToken), inOptions);
    }
}
