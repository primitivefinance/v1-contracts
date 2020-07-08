// SPDX-License-Identifier: MIT



pragma solidity ^0.6.2;

interface IOracle {
    function marketPrice() external view returns (uint256 market);

    function calculateIntrinsic(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote
    ) external view returns (uint256 intrinsic);

    function calculateExtrinsic(
        address underlyingToken,
        uint256 volatility,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external view returns (uint256 extrinsic);

    function calculatePremium(
        address underlyingToken,
        address strikeToken,
        uint256 volatility,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external view returns (uint256 premium);
}
