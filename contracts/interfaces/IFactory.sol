pragma solidity ^0.6.2;

interface IFactory {
    function deploy(address tokenU, address tokenS, uint base, uint price, uint expiry)
        external returns (address);
    function kill(address prime) external;
    function initialize(address prime, address redeem) external;
}