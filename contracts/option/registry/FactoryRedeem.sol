pragma solidity ^0.6.2;

/**
 * @title Protocol Factory Contract for Redeems
 * @author Primitive
 */

import "../primitives/PrimeRedeem.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FactoryRedeem is Ownable {
    using SafeMath for uint256;

    constructor(address registry) public { transferOwnership(registry); }

    function deploy(address tokenP, address underlying) external onlyOwner returns (address redeem) {
        redeem = address(new PrimeRedeem(owner(), tokenP, underlying));
    }
}