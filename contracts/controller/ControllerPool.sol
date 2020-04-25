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
    mapping(address => mapping(address => address payable)) public makerFor;

    constructor(address controller, address payable _weth) public {
        transferOwnership(controller);
        weth = _weth;
    }

    function addPool(
        address oracle,
        string memory name,
        string memory symbol,
        address tokenU,
        address tokenS
    ) public onlyOwner returns (address payable) {
        PrimePool primePool = new PrimePool(
            weth,
            oracle,
            name,
            symbol,
            tokenU,
            tokenS
        );
        makerFor[tokenU][tokenS] = address(primePool);
        return address(primePool);
    }

    function addMarket(address payable maker, address tokenP) public onlyOwner returns (address) {
        PrimePool(maker).addMarket(tokenP);
        return tokenP;
    }
}