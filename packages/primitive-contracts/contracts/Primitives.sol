// SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;

library Primitives {
    struct Option {
        address underlyingToken;
        address strikeToken;
        uint256 base;
        uint256 quote;
        uint256 expiry;
    }
}
