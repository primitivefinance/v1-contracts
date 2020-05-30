pragma solidity ^0.6.2;

/**
 * @dev Uniswap Factory like contract.
 */

interface IOracleLike {
    function getUnderlyingPrice(address cToken) external view returns (uint);
}

contract OracleLike is IOracleLike {

    uint256 public price;

    function setUnderlyingPrice(uint256 _price) public {
        price = _price;
    }

    function getUnderlyingPrice(address token) external view override returns (uint256 _price) {
        _price = price;
    }

}