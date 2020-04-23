pragma solidity ^0.6.2;

/**
 * @title Primitive's Instruments
 * @author Primitive
 */
library Instruments {
    struct PrimeOption {
        address tokenU;
        address tokenS;
        uint256 ratio;
        uint256 expiry;
    }
}