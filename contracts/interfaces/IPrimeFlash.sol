pragma solidity ^0.6.2;

interface IPrimeFlash {
    function primitiveFlash(address to, uint outTokenU, bytes calldata data) external; 
}