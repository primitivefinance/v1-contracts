pragma solidity ^0.6.2;

interface IRegistry {
    function deployOption(address tokenU, address tokenS, uint base, uint price, uint expiry)
        external returns (address);
    function kill(address prime) external;
    function initialize(address _factory, address _factoryRedeem) external;
    function optionsLength() external view returns (uint len);
    function addSupported(address token) external;
}