// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

/**
 * @title   Option test contract.
 * @author  Primitive
 */

import "../option/primitives/Option.sol";

contract OptionTest is Option {
    // solhint-disable-next-line no-empty-blocks
    constructor() public Option() {}

    function setExpiry(uint256 expiry) public {
        optionParameters.expiry = expiry;
    }

    function setRedeemToken(address redeem) public {
        redeemToken = redeem;
    }
}
