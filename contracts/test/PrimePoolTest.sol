pragma solidity ^0.6.2;

/**
 * @title   Primitive's Pool for Writing Short Ether Puts 
 * @author  Primitive
 */


import "../extensions/PrimePool.sol";

contract PrimePoolTest is PrimePool {

    constructor(
        address _weth,
        address _tokenP,
        address _oracle,
        address _factory,
        string memory name,
        string memory symbol
    ) 
        public 
        PrimePool(
        _weth,
        _tokenP,
        _oracle,
        _factory,
        name,
        symbol
    ) {}
}

    