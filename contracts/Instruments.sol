pragma solidity ^0.6.2;

/**
 * @title Primitive's Instruments
 * @author Primitive
 */
library Instruments {
    struct PrimeOption {
        address tokenU;
        address tokenS;
        uint256 base;
        uint256 price;
        uint256 expiry;
    }
}