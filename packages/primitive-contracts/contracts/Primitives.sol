// SPDX-License-Identifier: MIT









pragma solidity ^0.6.2;

/**
 * @title Library of Primitives
 * @author Primitive
 */
library Primitives {
    /*
     * @notice Vanilla Option.
     */
    struct Option {
        address underlyingToken;
        address strikeToken;
        uint256 base;
        uint256 quote;
        uint256 expiry;
    }
}
