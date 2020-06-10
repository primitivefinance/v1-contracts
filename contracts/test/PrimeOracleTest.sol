pragma solidity ^0.6.2;

import "../extensions/PrimeOracle.sol";

contract PrimeOracleTest is PrimeOracle {
    using SafeMath for uint;

    constructor(address _oracle, address _weth) public PrimeOracle(_oracle, _weth) {}

    function testSqrt(uint y) public view returns (uint z) {
        z = sqrt(y);
    }
}