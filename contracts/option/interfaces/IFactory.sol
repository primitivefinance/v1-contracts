pragma solidity ^0.6.2;

interface IFactory {
    function deploy(address tokenU, address tokenS, uint base, uint quote, uint expiry)
        external returns (address);
    function kill(address option) external;
    function initialize(address option, address redeem) external;
}