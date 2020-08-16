// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

interface IRedeemFactory {
    function deploy(address optionToken, address redeemableToken)
        external
        returns (address redeem);

    function deployRedeemTemplate() external;

    function redeemTemplate() external returns (address);
}
