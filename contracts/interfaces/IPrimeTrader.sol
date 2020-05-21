pragma solidity ^0.6.2;

import "./IPrime.sol";

interface IPrimeTrader {
    function safeWrite(IPrime tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenU,
        uint256 outTokenR
    );
    function safeExercise(IPrime tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenS,
        uint256 inTokenP,
        uint256 outTokenU
    );
    function safeRedeem(IPrime tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenR
    );
    function safeClose(IPrime tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenR,
        uint256 inTokenP,
        uint256 outTokenU
    );
    function safeUnwind(IPrime tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenR,
        uint256 inTokenP,
        uint256 outTokenU
    );
}