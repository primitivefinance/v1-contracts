pragma solidity ^0.6.2;

/**
 * @title Primitive's Market Maker Creator Contract
 * @author Primitive
 */

import '../PrimePool.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract ControllerPool is Ownable {

    constructor(address controller) public {
        transferOwnership(controller);
    }

    function addPool(address compoundEther) public onlyOwner returns (address) {
        PrimePool primePool = new PrimePool(compoundEther);
        return address(primePool);
    }
}