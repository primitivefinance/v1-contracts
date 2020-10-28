// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

interface IFlash {
    function primitiveFlash(
        address receiver,
        uint256 outUnderlyings,
        bytes calldata data
    ) external;
}
