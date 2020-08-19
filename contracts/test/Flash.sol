// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

/**
 * @title Test Flash Exercise contract
 * @author Primitive
 */

/**
 * A flash exercise is initiated by the exerciseOptions() function in the Option.sol contract.
 * Warning: Only correctly implemented wrapper smart contracts can safely execute these flash features.
 * Underlying tokens will be sent to the msg.sender of the exerciseOptions() call first.
 * The msg.sender should be a smart contract that implements the IFlash interface, which has a single
 * function: primitiveFlash().
 * The callback function primitiveFlash() can be triggered by passing in any arbritrary data to the
 * exerciseOptions() function. If the length of the data is greater than 0, it triggers the callback.
 * The implemented primitiveFlash() callback is where customized operations can be undertaken using the
 * underlying tokens received from the flash exercise.
 * After the callback function (whether its called or not), the exerciseOptions() function checks to see
 * if it has been paid the correct amount of strike and option tokens (an actual exercise of the option),
 * or if it has received the same quantity of underlying tokens back (a flash loan).
 */

import { IOption } from "../option/interfaces/IOption.sol";
import { IFlash } from "../option/interfaces/IFlash.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Flash is IFlash {
    using SafeMath for uint256;

    address public optionToken;

    event FlashExercise(address indexed from);

    constructor(address _optionToken) public {
        optionToken = _optionToken;
    }

    function goodFlashLoan(uint256 amount) external {
        // Call the exerciseOptions function and trigger the fallback function by passing in data
        IOption(optionToken).exerciseOptions(
            address(this),
            amount,
            new bytes(1)
        );
    }

    function badFlashLoan(uint256 amount) external {
        // Call the exerciseOptions function and trigger the fallback function by passing in data
        // bytes(2) will cause our implemented flash exercise to fail
        IOption(optionToken).exerciseOptions(
            address(this),
            amount,
            new bytes(2)
        );
    }

    /**
     * @dev An implemented primitiveFlash callback function that matches the interface in Option.sol.
     * @notice Calling the exerciseOptions() function in the Option contract will trigger this callback function.
     * @param receiver The account which receives the underlying tokens.
     * @param outUnderlyings The quantity of underlying tokens received as a flash loan.
     * @param data Any data that will be passed as an argument to the original exerciseOptions() call.
     */
    function primitiveFlash(
        address receiver,
        uint256 outUnderlyings,
        bytes calldata data
    ) external override {
        // Get the underlying token address.
        address underlyingToken = IOption(optionToken)
            .getUnderlyingTokenAddress();
        // In our test case we pass in the data param with bytes(1).
        bool good = keccak256(abi.encodePacked(data)) ==
            keccak256(abi.encodePacked(new bytes(1)));
        // If the flash exercise went through, we return the loaned underlyings.
        if (good) {
            IERC20(underlyingToken).transfer(optionToken, outUnderlyings);
        }
        emit FlashExercise(receiver);
    }
}
