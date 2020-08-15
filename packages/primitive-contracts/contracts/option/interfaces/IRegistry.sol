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

    function initialize(address _factory, address _factoryRedeem) external;

    function addSupported(address token) external;

    function optionFactory() external returns (address);

    function redeemFactory() external returns (address);
}
