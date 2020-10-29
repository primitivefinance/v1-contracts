// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

// Primitive
import { IOption } from "../../option/interfaces/IOption.sol";
import { IWETH } from "./IWETH.sol";

interface IWethConnector {
    function weth() external view returns (IWETH);

    function safeMintWithETH(IOption optionToken, address receiver)
        external
        payable
        returns (uint256, uint256);

    function safeExerciseWithETH(IOption optionToken, address receiver)
        external
        payable
        returns (uint256, uint256);

    function safeExerciseForETH(
        IOption optionToken,
        uint256 exerciseQuantity,
        address receiver
    ) external returns (uint256, uint256);

    function safeRedeemForETH(
        IOption optionToken,
        uint256 redeemQuantity,
        address receiver
    ) external returns (uint256);

    function safeCloseForETH(
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

    function safeUnwindForETH(
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
