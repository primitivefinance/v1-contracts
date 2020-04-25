pragma solidity ^0.6.2;

/**
 * @title Primitive's Market Maker Creator Contract
 * @author Primitive
 */

import "../PrimePool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ControllerPool is Ownable {

    PrimePool public _maker;
    address payable public weth;

    constructor(address controller, address payable _weth) public {
        transferOwnership(controller);
        weth = _weth;
    }

    function addPool(address compoundEther, address oracle) public onlyOwner returns (address) {
        PrimePool primePool = new PrimePool(compoundEther, oracle, weth);
        _maker = primePool;
        return address(primePool);
    }

    function addMarket(address payable primeOption) public onlyOwner returns (address) {
        _maker.addMarket(primeOption);
        return primeOption;
    }
}