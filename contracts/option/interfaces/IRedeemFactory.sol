// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

interface IRedeemFactory {
    function deployClone(address optionToken) external returns (address);

    function deployRedeemTemplate() external;

    function redeemTemplate() external returns (address);
}
