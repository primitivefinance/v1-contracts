// SPDX-License-Identifier: MIT





pragma solidity ^0.6.2;

/**
 * @title   Option test contract.
 * @author  Primitive
 */

import "../option/primitives/Option.sol";

contract OptionTest is Option {
    constructor() public Option() {}

    function setExpiry(uint256 expiry) public {
        parameters.expiry = expiry;
    }

    function setRedeemToken(address redeem) public {
        redeemToken = redeem;
    }
}
