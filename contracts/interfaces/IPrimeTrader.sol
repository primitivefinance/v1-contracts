pragma solidity ^0.6.2;

import "./IPrime.sol";

interface IPrimeTrader {
    function safeRedeem(IPrime tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenR
    );
    function safeSwap(IPrime tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenS,
        uint256 inTokenP,
        uint256 outTokenU
    );
    function safeMint(IPrime tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenU,
        uint256 outTokenR
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