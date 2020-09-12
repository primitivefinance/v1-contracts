// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

import { IOption } from "../option/interfaces/IOption.sol";

interface IEthTrader {
    function safeEthMint(
        IOption optionToken,
        uint256 mintQuantity,
        address receiver
    ) external payable returns (uint256, uint256);

    function safeEthExercise(
        IOption optionToken,
        uint256 exerciseQuantity,
        address receiver
    ) external payable returns (uint256, uint256);

    function safeEthRedeem(
        IOption optionToken,
        uint256 redeemQuantity,
        address receiver
    ) external payable returns (uint256);

    function safeEthClose(
        IOption optionToken,
        uint256 closeQuantity,
        address receiver
    )
        external
        payable
        returns (
            uint256,
            uint256,
            uint256
        );

    function safeEthUnwind(
        IOption optionToken,
        uint256 unwindQuantity,
        address receiver
    )
        external
        payable
        returns (
            uint256,
            uint256,
            uint256
        );
}
