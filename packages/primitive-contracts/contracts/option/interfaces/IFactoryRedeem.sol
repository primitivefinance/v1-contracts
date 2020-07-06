pragma solidity ^0.6.2;

interface IFactoryRedeem {
    function deploy(address tokenP, address underlying)
        external
        returns (address);
}
