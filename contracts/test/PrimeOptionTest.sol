pragma solidity ^0.6.2;

/**
 * @title   Prime Option test contract.
 * @author  Primitive
 */


import "../primitives/PrimeOption.sol";

contract PrimeOptionTest is PrimeOption {

    constructor(
        address tokenU,
        address tokenS,
        uint256 base,
        uint256 price,
        uint256 expiry
    )
        public
        PrimeOption(
            tokenU,
            tokenS,
            base,
            price,
            expiry
        )
    { }

    function setExpiry(uint256 expiry) public {
        option.expiry = expiry;
    }

    function setTokenR(address redeem) public {
        tokenR = redeem;
    }

}

    