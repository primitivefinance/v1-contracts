// SPDX-License-Identifier: MIT











pragma solidity ^0.6.2;

import { IOption } from "./IOption.sol";

interface ITrader {
    function safeMint(
        IOption optionToken,
        uint256 mintQuantity,
        address receiver
    ) external returns (uint256 inTokenU, uint256 outTokenR);

    function safeExercise(
        IOption optionToken,
        uint256 exerciseQuantity,
        address receiver
    ) external returns (uint256 inTokenS, uint256 inOptions);

    function safeRedeem(
        IOption optionToken,
        uint256 redeemQuantity,
        address receiver
    ) external returns (uint256 inRedeems);

    function safeClose(
        IOption optionToken,
        uint256 closeQuantity,
        address receiver
    )
        external
        returns (
            uint256 inRedeems,
            uint256 inOptions,
            uint256 outUnderlyings
        );

    function safeUnwind(
        IOption optionToken,
        uint256 unwindQuantity,
        address receiver
    )
        external
        returns (
            uint256 inRedeems,
            uint256 inOptions,
            uint256 outUnderlyings
        );
}
