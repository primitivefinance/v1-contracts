pragma solidity ^0.6.2;

/**
 * @title Primitive's Exchange Pool Creator Contract
 * @author Primitive
 */

import '../PrimeExchange.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract ControllerExchange is Ownable {

    constructor(address controller) public {
        transferOwnership(controller);
    }

    function addExchange(address primeOption) public onlyOwner returns (address) {
        PrimeExchange primeExchange = new PrimeExchange(primeOption);
        return address(primeExchange);
    }
}