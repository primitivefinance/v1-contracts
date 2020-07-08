// SPDX-License-Identifier: MIT



pragma solidity ^0.6.2;

/**
 * @title   Primitive's Pool for Writing Short Ether Puts 
 * @author  Primitive
 */


import "../pool/extensions/Pool.sol";

contract PoolTest is Pool {

    constructor(
        address _weth,
        address _tokenP,
        address _oracle,
        address _factory,
        string memory name,
        string memory symbol
    ) public Pool(_factory, _tokenP) {}
}

    