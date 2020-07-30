// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

interface IOption {
    function mint(address receiver) external returns (uint inUnderlyings, uint outRedeems);

    function exercise(
        address receiver,
        uint outUnderlyings,
        bytes calldata data
    ) external returns (uint inStrikes, uint inOptions);

    function redeem(address receiver) external returns (uint inRedeems);

    function close(address receiver)
        external
        returns (
            uint inRedeems,
            uint inOptions,
            uint outUnderlyings
        );

    function redeemToken() external view returns (address);

    function strikeToken() external view returns (address);

    function underlyingToken() external view returns (address);

    function base() external view returns (uint);

    function quote() external view returns (uint);

    function expiry() external view returns (uint);

    function underlyingCache() external view returns (uint);

    function strikeCache() external view returns (uint);

    function factory() external view returns (address);

    function caches() external view returns (uint _underlyingCache, uint _strikeCache);

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
            uint _base,
            uint _quote,
            uint _expiry
        );

    function initRedeemToken(address _redeemToken) external;

    // solhint-disable-next-line
    function EXERCISE_FEE() external view returns (uint);
}
