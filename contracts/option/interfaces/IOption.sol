// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IOption is IERC20 {
    function mintOptions(address receiver)
        external
        returns (uint256 inUnderlyings, uint256 outRedeems);

    function exerciseOptions(
        address receiver,
        uint256 outUnderlyings,
        bytes calldata data
    ) external returns (uint256 inStrikes, uint256 inOptions);

    function redeemStrikeTokens(address receiver)
        external
        returns (uint256 inRedeems);

    function closeOptions(address receiver)
        external
        returns (
            uint256 inRedeems,
            uint256 inOptions,
            uint256 outUnderlyings
        );

    function redeemToken() external view returns (address);

    function getStrikeTokenAddress() external view returns (address);

    function getUnderlyingTokenAddress() external view returns (address);

<<<<<<< HEAD:contracts/option/interfaces/IOption.sol
<<<<<<< HEAD
<<<<<<< HEAD
    function getBaseValue() external view returns (uint256);

    function getQuoteValue() external view returns (uint256);

    function getExpiryTime() external view returns (uint256);
=======
    function base() external view returns (uint);

    function quote() external view returns (uint);

    function expiry() external view returns (uint);
>>>>>>> 7e9e00418e7ccb1da05482f268175836af98474d
=======
    function getBaseValue() external view returns (uint);
=======
    function getBaseValue() external view returns (uint256);
>>>>>>> develop/develop:packages/primitive-contracts/contracts/option/interfaces/IOption.sol

    function getQuoteValue() external view returns (uint);

<<<<<<< HEAD:contracts/option/interfaces/IOption.sol
    function getExpiryTime() external view returns (uint);
>>>>>>> release/v0.3.0
=======
    function getExpiryTime() external view returns (uint256);
>>>>>>> develop/develop:packages/primitive-contracts/contracts/option/interfaces/IOption.sol

    function underlyingCache() external view returns (uint256);

    function strikeCache() external view returns (uint256);

    function factory() external view returns (address);

<<<<<<< HEAD:contracts/option/interfaces/IOption.sol
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> develop/develop:packages/primitive-contracts/contracts/option/interfaces/IOption.sol
    function getCacheBalances()
        external
        view
        returns (uint256 _underlyingCache, uint256 _strikeCache);
<<<<<<< HEAD:contracts/option/interfaces/IOption.sol
=======
    function caches() external view returns (uint _underlyingCache, uint _strikeCache);
>>>>>>> 7e9e00418e7ccb1da05482f268175836af98474d
=======
    function getCacheBalances() external view returns (uint _underlyingCache, uint _strikeCache);
>>>>>>> release/v0.3.0
=======
>>>>>>> develop/develop:packages/primitive-contracts/contracts/option/interfaces/IOption.sol

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
            uint256 _base,
            uint256 _quote,
            uint256 _expiry
        );

    function initRedeemToken(address _redeemToken) external;

<<<<<<< HEAD:contracts/option/interfaces/IOption.sol
<<<<<<< HEAD
<<<<<<< HEAD
    function updateCacheBalances() external;
=======
    // solhint-disable-next-line
    function EXERCISE_FEE() external view returns (uint);
>>>>>>> 7e9e00418e7ccb1da05482f268175836af98474d
=======
    function updateCacheBalances() external;
>>>>>>> release/v0.3.0
=======
    function updateCacheBalances() external;
>>>>>>> develop/develop:packages/primitive-contracts/contracts/option/interfaces/IOption.sol
}
