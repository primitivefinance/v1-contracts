// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

import { IOption } from "./IOption.sol";

interface ITrader {
    function safeMint(
        IOption optionToken,
        uint mintQuantity,
        address receiver
    ) external returns (uint outputOptions, uint outputRedeems);

    function safeExercise(
        IOption optionToken,
        uint exerciseQuantity,
        address receiver
    ) external returns (uint inStrikes, uint inOptions);

    function safeRedeem(
        IOption optionToken,
        uint redeemQuantity,
        address receiver
    ) external returns (uint inRedeems);

    function safeClose(
        IOption optionToken,
        uint closeQuantity,
        address receiver
    )
        external
        returns (
            uint inRedeems,
            uint inOptions,
            uint outUnderlyings
        );

    function safeUnwind(
        IOption optionToken,
        uint unwindQuantity,
        address receiver
    )
        external
        returns (
            uint inRedeems,
            uint inOptions,
            uint outUnderlyings
        );
}
