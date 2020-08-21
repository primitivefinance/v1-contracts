// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IOption is IERC20 {
    function mintOptions(address receiver) external returns (uint256, uint256);

    function exerciseOptions(
        address receiver,
        uint256 outUnderlyings,
        bytes calldata data
    ) external returns (uint256, uint256);

    function redeemStrikeTokens(address receiver) external returns (uint256);

    function closeOptions(address receiver)
        external
        returns (
            uint256,
            uint256,
            uint256
        );

    function redeemToken() external view returns (address);

    function getStrikeTokenAddress() external view returns (address);

    function getUnderlyingTokenAddress() external view returns (address);

    function getBaseValue() external view returns (uint256);

    function getQuoteValue() external view returns (uint256);

    function getExpiryTime() external view returns (uint256);

    function underlyingCache() external view returns (uint256);

    function strikeCache() external view returns (uint256);

    function factory() external view returns (address);

    function getCacheBalances() external view returns (uint256, uint256);

    function getAssetAddresses()
        external
        view
        returns (
            address,
            address,
            address
        );

    function getParameters()
        external
        view
        returns (
            address _underlyingToken,
            address _strikeToken,
            address _redeemToken,
            uint256 _base,
            uint256 _quote,
            uint256 _expiry
        );

    function initRedeemToken(address _redeemToken) external;

    function updateCacheBalances() external;
}
