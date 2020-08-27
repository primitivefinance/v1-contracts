// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

interface IOptionFactory {
    function deployClone(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external returns (address);

    function initRedeemToken(address optionAddress, address redeemAddress)
        external;

    function deployOptionTemplate() external;

    function optionTemplate() external returns (address);

    function calculateOptionAddress(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external view returns (address);
}
