// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

import { IOption } from "./IOption.sol";

interface ITrader {
    function safeMint(
        IOption optionToken,
        uint256 mintQuantity,
        address receiver
    ) external returns (uint256, uint256);

    function safeExercise(
        IOption optionToken,
        uint256 exerciseQuantity,
        address receiver
    ) external returns (uint256, uint256);

    function safeRedeem(
        IOption optionToken,
        uint256 redeemQuantity,
        address receiver
    ) external returns (uint256);

    function safeClose(
        IOption optionToken,
        uint256 closeQuantity,
        address receiver
    )
        external
        returns (
            uint256,
            uint256,
            uint256
        );

    function safeUnwind(
        IOption optionToken,
        uint256 unwindQuantity,
        address receiver
    )
        external
        returns (
            uint256,
            uint256,
            uint256
        );
}
