pragma solidity ^0.6.2;

/**
 * @title   Prime Option test contract.
 * @author  Primitive
 */


import "../PrimeOption.sol";

contract PrimeOptionTest is PrimeOption {

    constructor(
        string memory name,
        string memory symbol,
        uint256 _marketId,
        address tokenU,
        address tokenS,
        uint256 base,
        uint256 price,
        uint256 expiry
    )
        public
        PrimeOption(
            name,
            symbol,
            _marketId,
            tokenU,
            tokenS,
            base,
            price,
            expiry
        )
    {}

    function setExpiry(uint256 expiry) public {
        option.expiry = expiry;
    }

}

    