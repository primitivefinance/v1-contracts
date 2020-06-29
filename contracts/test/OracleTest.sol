pragma solidity ^0.6.2;

import "../pool/extensions/Oracle.sol";

contract OracleTest is Oracle {
    using SafeMath for uint;

    constructor(address _oracle, address _weth) public Oracle(_oracle, _weth) {}

    function testSqrt(uint y) public view returns (uint z) {
        z = sqrt(y);
    }
}