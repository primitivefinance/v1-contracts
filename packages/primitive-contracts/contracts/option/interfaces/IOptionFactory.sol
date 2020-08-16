// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

interface IOptionFactory {
    function deploy(
        address underlyingToken,
        address strikeToken,
        uint base,
        uint quote,
        uint expiry
    ) external returns (address);

    function kill(address option) external;

    function initialize(address option, address redeem) external;
}
