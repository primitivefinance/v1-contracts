// SPDX-License-Identifier: MIT







pragma solidity ^0.6.2;

interface IOption {
    function mint(address receiver)
        external
        returns (uint256 inUnderlyings, uint256 outRedeems);

    function exercise(
        address receiver,
        uint256 outUnderlyings,
        bytes calldata data
    ) external returns (uint256 inStrikes, uint256 inOptions);

    function redeem(address receiver) external returns (uint256 inRedeems);

    function close(address receiver)
        external
        returns (
            uint256 inRedeems,
            uint256 inOptions,
            uint256 outUnderlyings
        );

    function redeemToken() external view returns (address);

    function strikeToken() external view returns (address);

    function underlyingToken() external view returns (address);

    function base() external view returns (uint256);

    function quote() external view returns (uint256);

    function expiry() external view returns (uint256);

    function underlyingCache() external view returns (uint256);

    function strikeCache() external view returns (uint256);

    function factory() external view returns (address);

    function caches()
        external
        view
        returns (uint256 _underlyingCache, uint256 _strikeCache);

    function tokens()
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
            address _strikeToken,
            address _underlyingToken,
            address _redeemToken,
            uint256 _base,
            uint256 _quote,
            uint256 _expiry
        );

    function initRedeemToken(address _redeemToken) external;

    // solhint-disable-next-line
    function EXERCISE_FEE() external view returns (uint256);
}
