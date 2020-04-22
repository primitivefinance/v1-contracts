pragma solidity ^0.6.2;

/**
 * @title Primitive's Redeem Creator Contract
 * @author Primitive
 */

import '../PrimeRedeem.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract ControllerRedeem is Ownable {

    constructor(address controller) public {
        transferOwnership(controller);
    }

    function addRedeem(string memory name, string memory symbol, bool isCallOption) public onlyOwner returns (address) {
        PrimeRedeem primeRedeem = new PrimeRedeem(name, symbol, isCallOption);
        return address(primeRedeem);
    }

    function setValid(address primeOption, address redeemAddress) public onlyOwner returns (bool) {
        PrimeRedeem primeRedeem = PrimeRedeem(redeemAddress);
        return primeRedeem.setValid(primeOption);
    }
}