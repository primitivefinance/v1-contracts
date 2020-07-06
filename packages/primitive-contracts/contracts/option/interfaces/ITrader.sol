pragma solidity ^0.6.2;

import "./IOption.sol";

interface ITrader {
    function safeMint(
        IOption tokenP,
        uint256 amount,
        address receiver
    ) external returns (uint256 inTokenU, uint256 outTokenR);

    function safeExercise(
        IOption tokenP,
        uint256 amount,
        address receiver
    ) external returns (uint256 inTokenS, uint256 inTokenP);

    function safeRedeem(
        IOption tokenP,
        uint256 amount,
        address receiver
    ) external returns (uint256 inTokenR);

    function safeClose(
        IOption tokenP,
        uint256 amount,
        address receiver
    )
        external
        returns (
            uint256 inTokenR,
            uint256 inTokenP,
            uint256 outTokenU
        );

    function safeUnwind(
        IOption tokenP,
        uint256 amount,
        address receiver
    )
        external
        returns (
            uint256 inTokenR,
            uint256 inTokenP,
            uint256 outTokenU
        );
}
