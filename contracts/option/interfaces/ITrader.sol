// SPDX-License-Identifier: MIT

<<<<<<< HEAD:contracts/option/interfaces/ITrader.sol
<<<<<<< HEAD
<<<<<<< HEAD


=======
>>>>>>> 7e9e00418e7ccb1da05482f268175836af98474d
=======
>>>>>>> release/v0.3.0
=======


>>>>>>> develop/develop:packages/primitive-contracts/contracts/option/interfaces/ITrader.sol
pragma solidity ^0.6.2;

import { IOption } from "./IOption.sol";

interface ITrader {
    function safeMint(
        IOption optionToken,
        uint256 mintQuantity,
        address receiver
<<<<<<< HEAD:contracts/option/interfaces/ITrader.sol
<<<<<<< HEAD
    ) external returns (uint256 outputOptions, uint256 outputRedeems);
=======
    ) external returns (uint outputOptions, uint outputRedeems);
>>>>>>> release/v0.3.0
=======
    ) external returns (uint256 outputOptions, uint256 outputRedeems);
>>>>>>> develop/develop:packages/primitive-contracts/contracts/option/interfaces/ITrader.sol

    function safeExercise(
        IOption optionToken,
        uint256 exerciseQuantity,
        address receiver
<<<<<<< HEAD:contracts/option/interfaces/ITrader.sol
<<<<<<< HEAD
    ) external returns (uint256 inStrikes, uint256 inOptions);
=======
    ) external returns (uint inStrikes, uint inOptions);
>>>>>>> release/v0.3.0
=======
    ) external returns (uint256 inStrikes, uint256 inOptions);
>>>>>>> develop/develop:packages/primitive-contracts/contracts/option/interfaces/ITrader.sol

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
