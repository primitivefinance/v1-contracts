pragma solidity ^0.6.2;

/**
 * @title Library of Primitives
 * @author Primitive
 */
library Primitives {
    /* 
     * @notice Vanilla Option.
     */
    struct Prime {
        address tokenU;
        address tokenS;
        uint256 base;
        uint256 price;
        uint256 expiry;
    }
}