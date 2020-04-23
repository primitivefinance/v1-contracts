pragma solidity ^0.6.2;

/**
 * @title Primitive's Market Maker Creator Contract
 * @author Primitive
 */

import "../PrimePerpetual.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract ControllerPerpetual is Ownable {

    PrimePerpetual public _perpetual;

    constructor(address controller) public {
        transferOwnership(controller);
    }

    function addPerpetual(address compoundDai) public onlyOwner returns (address) {
        PrimePerpetual primePerpetual = new PrimePerpetual(compoundDai);
        _perpetual = primePerpetual;
        return address(primePerpetual);
    }

    function addMarket(address payable primeOption) public onlyOwner returns (address) {
        _perpetual.addMarket(primeOption);
        return primeOption;
    }
}