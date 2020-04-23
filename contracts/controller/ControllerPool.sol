pragma solidity ^0.6.2;

/**
 * @title Primitive's Market Maker Creator Contract
 * @author Primitive
 */

import "../PrimePool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ControllerPool is Ownable {

    PrimePool public _maker;

    constructor(address controller) public {
        transferOwnership(controller);
    }

    function addPool(address compoundEther, address oracle) public onlyOwner returns (address) {
        PrimePool primePool = new PrimePool(compoundEther, oracle);
        _maker = primePool;
        return address(primePool);
    }

    function addMarket(address payable primeOption) public onlyOwner returns (address) {
        _maker.addMarket(primeOption);
        return primeOption;
    }
}