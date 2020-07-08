// SPDX-License-Identifier: MIT



pragma solidity ^0.6.2;

import "../pool/extensions/Oracle.sol";

contract OracleTest is Oracle {
    using SafeMath for uint256;

    constructor(address _oracle, address _weth) public Oracle(_oracle, _weth) {}

    function testSqrt(uint256 y) public pure returns (uint256 z) {
        z = sqrt(y);
    }
}
