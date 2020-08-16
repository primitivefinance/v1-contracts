// SPDX-License-Identifier: MIT











pragma solidity ^0.6.2;

interface IRedeem {
    function optionToken() external view returns (address);

    function redeemableToken() external view returns (address);

    function factory() external view returns (address);

    function mint(address user, uint256 amount) external;

    function burn(address user, uint256 amount) external;
}
