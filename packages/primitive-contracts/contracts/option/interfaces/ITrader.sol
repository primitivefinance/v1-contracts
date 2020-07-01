pragma solidity ^0.6.2;

import "./IOption.sol";

interface ITrader {
    function safeMint(IOption tokenP, uint amount, address receiver) external returns (
        uint inTokenU,
        uint outTokenR
    );
    function safeExercise(IOption tokenP, uint amount, address receiver) external returns (
        uint inTokenS,
        uint inTokenP
    );
    function safeRedeem(IOption tokenP, uint amount, address receiver) external returns (
        uint inTokenR
    );
    function safeClose(IOption tokenP, uint amount, address receiver) external returns (
        uint inTokenR,
        uint inTokenP,
        uint outTokenU
    );
    function safeUnwind(IOption tokenP, uint amount, address receiver) external returns (
        uint inTokenR,
        uint inTokenP,
        uint outTokenU
    );
}