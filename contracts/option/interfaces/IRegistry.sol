// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

interface IRegistry {
    function deployOption(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external returns (address);

    function initialize(address _factory, address _factoryRedeem) external;

    function optionsLength() external view returns (uint256 len);

    function addSupported(address token) external;

    function optionFactory() external returns (address);

    function redeemFactory() external returns (address);

    function getOption(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external view returns (address option);
}
