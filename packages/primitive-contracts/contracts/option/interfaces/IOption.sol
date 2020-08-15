// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IOption is IERC20 {
    function mintOptions(address receiver) external returns (uint inUnderlyings, uint outRedeems);

    function exerciseOptions(
        address receiver,
        uint outUnderlyings,
        bytes calldata data
    ) external returns (uint inStrikes, uint inOptions);

    function redeemStrikeTokens(address receiver) external returns (uint inRedeems);

    function closeOptions(address receiver)
        external
        returns (
            uint inRedeems,
            uint inOptions,
            uint outUnderlyings
        );

    function redeemToken() external view returns (address);

    function getStrikeTokenAddress() external view returns (address);

    function getUnderlyingTokenAddress() external view returns (address);

    function getBaseValue() external view returns (uint);

    function getQuoteValue() external view returns (uint);

    function getExpiryTime() external view returns (uint);

    function underlyingCache() external view returns (uint);

    function strikeCache() external view returns (uint);

    function factory() external view returns (address);

    function getCacheBalances() external view returns (uint _underlyingCache, uint _strikeCache);

    function getAssetAddresses()
        external
        view
        returns (
            address _underlyingToken,
            address _strikeToken,
            address _redeemToken
        );

    function getParameters()
        external
        view
        returns (
            address _underlyingToken,
            address _strikeToken,
            address _redeemToken,
            uint _base,
            uint _quote,
            uint _expiry
        );

    function initRedeemToken(address _redeemToken) external;

    function updateCacheBalances() external;
}
