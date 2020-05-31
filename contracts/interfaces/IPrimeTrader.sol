pragma solidity ^0.6.2;

import "./IPrime.sol";

interface IPrimeTrader {
    function safeMint(IPrime tokenP, uint amount, address receiver) external returns (
        uint inTokenU,
        uint outTokenR
    );
    function safeExercise(IPrime tokenP, uint amount, address receiver) external returns (
        uint inTokenS,
        uint inTokenP,
        uint outTokenU
    );
    function safeRedeem(IPrime tokenP, uint amount, address receiver) external returns (
        uint inTokenR
    );
    function safeClose(IPrime tokenP, uint amount, address receiver) external returns (
        uint inTokenR,
        uint inTokenP,
        uint outTokenU
    );
    function safeUnwind(IPrime tokenP, uint amount, address receiver) external returns (
        uint inTokenR,
        uint inTokenP,
        uint outTokenU
    );
}