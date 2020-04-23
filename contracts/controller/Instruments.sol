pragma solidity ^0.6.2;

/**
 * @title Primitive's Instruments
 * @author Primitive
 */
library Instruments {
    struct PrimeOption {
        uint256 tokenQU;
        address tokenU;
        uint256 tokenQS;
        address tokenS;
        uint256 expiry;
    }
}