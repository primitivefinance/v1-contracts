pragma solidity ^0.6.2;

interface IFlash {
    function primitiveFlash(
        address receiver,
        uint256 outTokenU,
        bytes calldata data
    ) external;
}
