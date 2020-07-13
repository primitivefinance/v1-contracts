// SPDX-License-Identifier: MIT











pragma solidity ^0.6.2;

interface ICToken {
    function mint(uint256 mintAmount) external returns (uint256);

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

    function balanceOfUnderlying(address owner) external view returns (uint256);

    function underlying() external view returns (address);
}
