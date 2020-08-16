// SPDX-License-Identifier: MIT









pragma solidity ^0.6.2;

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
        // trigger the fallback function
        IOption(optionToken).exercise(address(this), amount, new bytes(1));
    }

    function badFlashLoan(uint256 amount) external {
        // trigger the fallback function
        IOption(optionToken).exercise(address(this), amount, new bytes(2));
    }

    function primitiveFlash(
        address receiver,
        uint256 outUnderlyings,
        bytes calldata data
    ) external override {
        // just return the underlyingToken to the option contract
        (
            address underlyingToken,
            address strikeToken,
            ,
            uint256 base,
            uint256 quote,

        ) = IOption(optionToken).getParameters();
        uint256 payment = outUnderlyings.div(1000).mul(quote).div(base);
        bool good = keccak256(abi.encodePacked(data)) ==
            keccak256(abi.encodePacked(new bytes(1)));
        if (good) {
            IERC20(underlyingToken).transfer(optionToken, outUnderlyings);
            IERC20(strikeToken).transfer(optionToken, payment);
        }
        emit FlashExercise(receiver);
    }
}
