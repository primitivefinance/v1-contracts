pragma solidity ^0.6.2;

/**
 * @title Primitive's Redeem Creator Contract
 * @author Primitive
 */

import "../PrimeRedeem.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ControllerRedeem is Ownable {

    constructor(address controller) public {
        transferOwnership(controller);
    }

    function addRedeem(
        string memory name,
        string memory symbol,
        address tokenP,
        address tokenS
    ) public onlyOwner returns (address) {
        PrimeRedeem primeRedeem = new PrimeRedeem(name, symbol, tokenP, tokenS);
        return address(primeRedeem);
    }
}