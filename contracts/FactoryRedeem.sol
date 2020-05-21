pragma solidity ^0.6.2;

/**
 * @title Redeem Factory Contract
 * @author Primitive
 */

import "./PrimeRedeem.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RedeemFactory is Ownable {
    using SafeMath for uint256;

    constructor(address _factory) public { transferOwnership(_factory); }

    function deploy(address tokenP, address underlying) external returns (address redeem) {
        redeem = address(new PrimeRedeem(owner(), tokenP, underlying));
    }
}