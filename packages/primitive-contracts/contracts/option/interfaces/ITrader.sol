// SPDX-License-Identifier: MIT

<<<<<<< HEAD
<<<<<<< HEAD


=======
>>>>>>> 7e9e00418e7ccb1da05482f268175836af98474d
=======
>>>>>>> release/v0.3.0
pragma solidity ^0.6.2;

import { IOption } from "./IOption.sol";

interface ITrader {
    function safeMint(
        IOption optionToken,
        uint mintQuantity,
        address receiver
<<<<<<< HEAD
    ) external returns (uint256 outputOptions, uint256 outputRedeems);
=======
    ) external returns (uint outputOptions, uint outputRedeems);
>>>>>>> release/v0.3.0

    function safeExercise(
        IOption optionToken,
        uint exerciseQuantity,
        address receiver
<<<<<<< HEAD
    ) external returns (uint256 inStrikes, uint256 inOptions);
=======
    ) external returns (uint inStrikes, uint inOptions);
>>>>>>> release/v0.3.0

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
