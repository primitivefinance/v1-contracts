pragma solidity ^0.6.2;

/**
 * @title   Option test contract.
 * @author  Primitive
 */


import "../option/primitives/Option.sol";

contract OptionTest is Option {

    constructor(
        address tokenU,
        address tokenS,
        uint256 base,
        uint256 price,
        uint256 expiry
    )
        public
        Option(
            /* tokenU,
            tokenS,
            base,
            price,
            expiry */
        )
    { }

    function setExpiry(uint256 expiry) public {
        option.expiry = expiry;
    }

    function setTokenR(address redeem) public {
        tokenR = redeem;
    }

}

    