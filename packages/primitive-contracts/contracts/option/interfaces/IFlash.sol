pragma solidity ^0.6.2;

interface IFlash {
    function primitiveFlash(address receiver, uint outTokenU, bytes calldata data) external; 
}