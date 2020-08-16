// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

interface IRegistry {
    function deployOption(
        address underlyingToken,
        address strikeToken,
        uint base,
        uint quote,
        uint expiry
    ) external returns (address);

    function kill(address option) external;

    function initialize(address _factory, address _factoryRedeem) external;

    function addSupported(address token) external;
}
