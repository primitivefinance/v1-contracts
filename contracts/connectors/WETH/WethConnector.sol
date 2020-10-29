// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

/**
 * @title   Weth Connector for bridging ether to WETH Primitive options.
 * @notice  Abstracts the interfacing with the protocol's option contract for ease-of-use.
 *          Manages operations involving options with WETH as the underlying or strike asset.
 *          Accepts deposits in ethers and withdraws ethers.
 * @author  Primitive
 */

// WETH Interface
import { IWETH } from "./IWETH.sol";
// Primitive
import { IOption } from "../../option/interfaces/IOption.sol";
import { TraderLib } from "../../option/libraries/TraderLib.sol";
import { IWethConnector } from "./IWethConnector.sol";
import { WethRouterLib } from "./WethRouterLib.sol";
// Open Zeppelin
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract WethConnector is IWethConnector, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IWETH public weth;

    event WethConnectorMint(
        address indexed from,
        address indexed option,
        uint256 outputOptions,
        uint256 outputRedeems
    );
    event WethConnectorExercise(
        address indexed from,
        address indexed option,
        uint256 outUnderlyings,
        uint256 inStrikes
    );
    event WethConnectorRedeem(
        address indexed from,
        address indexed option,
        uint256 inRedeems
    );
    event WethConnectorClose(
        address indexed from,
        address indexed option,
        uint256 inOptions
    );

    event WethConnectorUnwind(
        address indexed from,
        address indexed option,
        uint256 inOptions
    );

    /**
     * @dev Checks the quantity of an operation to make sure its not zero. Fails early.
     */
    modifier nonZero(uint256 quantity) {
        require(quantity > 0, "ERR_ZERO");
        _;
    }

    /**
     * @dev Since the WethConnector contract is responsible for converting between ethers and WETH,
     * the contract is initialized with the address for WETH.
     */
    constructor(address payable _weth) public {
        weth = IWETH(_weth);
    }

    /**
     * @dev If ether is sent to this contract through a normal transaction, it will fail, unless
     * it was the WETH contract who sent it.
     */
    receive() external payable {
        assert(msg.sender == address(weth));
    }

    // ==== Operation Functions ====

    /**
     * @dev Mints msg.value quantity of options and "quote" (option parameter) quantity of redeem tokens.
     * @notice This function is for options that have WETH as the underlying asset.
     * @param optionToken The address of the option token to mint.
     * @param receiver The address which receives the minted option and redeem tokens.
     */
    function safeMintWithETH(IOption optionToken, address receiver)
        external
        override
        payable
        nonReentrant
        nonZero(msg.value)
        returns (uint256, uint256)
    {
        (uint256 outputOptions, uint256 outputRedeems) = WethRouterLib
            .safeMintWithETH(weth, optionToken, receiver);
        emit WethConnectorMint(
            msg.sender,
            address(optionToken),
            outputOptions,
            outputRedeems
        );

        return (outputOptions, outputRedeems);
    }

    /**
     * @dev Swaps msg.value of strikeTokens (ethers) to underlyingTokens.
     * Uses the strike ratio as the exchange rate. Strike ratio = base / quote.
     * Msg.value (quote units) * base / quote = base units (underlyingTokens) to withdraw.
     * @notice This function is for options with WETH as the strike asset.
     * Burns option tokens, accepts ethers, and pushes out underlyingTokens.
     * @param optionToken The address of the option contract.
     * @param receiver The underlyingTokens are sent to the receiver address.
     */
    function safeExerciseWithETH(IOption optionToken, address receiver)
        external
        override
        payable
        nonReentrant
        nonZero(msg.value)
        returns (uint256, uint256)
    {
        (uint256 inputStrikes, uint256 inputOptions) = WethRouterLib
            .safeExerciseWithETH(weth, optionToken, receiver);

        emit WethConnectorExercise(
            msg.sender,
            address(optionToken),
            inputOptions,
            inputStrikes
        );

        return (inputStrikes, inputOptions);
    }

    /**
     * @dev Swaps strikeTokens to underlyingTokens, WETH, which is converted to ethers before withdrawn.
     * Uses the strike ratio as the exchange rate. Strike ratio = base / quote.
     * @notice This function is for options with WETH as the underlying asset.
     * Burns option tokens, pulls strikeTokens, and pushes out ethers.
     * @param optionToken The address of the option contract.
     * @param exerciseQuantity Quantity of optionTokens to exercise.
     * @param receiver The underlyingTokens (ethers) are sent to the receiver address.
     */
    function safeExerciseForETH(
        IOption optionToken,
        uint256 exerciseQuantity,
        address receiver
    )
        external
        override
        nonReentrant
        nonZero(exerciseQuantity)
        returns (uint256, uint256)
    {
        (uint256 inputStrikes, uint256 inputOptions) = WethRouterLib
            .safeExerciseForETH(weth, optionToken, exerciseQuantity, receiver);

        emit WethConnectorExercise(
            msg.sender,
            address(optionToken),
            exerciseQuantity,
            inputStrikes
        );

        return (inputStrikes, inputOptions);
    }

    /**
     * @dev Burns redeem tokens to withdraw strike tokens (ethers) at a 1:1 ratio.
     * @notice This function is for options that have WETH as the strike asset.
     * Converts WETH to ethers, and withdraws ethers to the receiver address.
     * @param optionToken The address of the option contract.
     * @param redeemQuantity The quantity of redeemTokens to burn.
     * @param receiver The strikeTokens (ethers) are sent to the receiver address.
     */
    function safeRedeemForETH(
        IOption optionToken,
        uint256 redeemQuantity,
        address receiver
    ) external override nonReentrant nonZero(redeemQuantity) returns (uint256) {
        uint256 inputRedeems = WethRouterLib.safeRedeemForETH(
            weth,
            optionToken,
            redeemQuantity,
            receiver
        );

        emit WethConnectorRedeem(
            msg.sender,
            address(optionToken),
            inputRedeems
        );
        return inputRedeems;
    }

    /**
     * @dev Burn optionTokens and redeemTokens to withdraw underlyingTokens (ethers).
     * @notice This function is for options with WETH as the underlying asset.
     * WETH underlyingTokens are converted to ethers before being sent to receiver.
     * The redeemTokens to burn is equal to the optionTokens * strike ratio.
     * inputOptions = inputRedeems / strike ratio = outUnderlyings
     * @param optionToken The address of the option contract.
     * @param closeQuantity Quantity of optionTokens to burn and an input to calculate how many redeems to burn.
     * @param receiver The underlyingTokens (ethers) are sent to the receiver address.
     */
    function safeCloseForETH(
        IOption optionToken,
        uint256 closeQuantity,
        address receiver
    )
        external
        override
        nonReentrant
        nonZero(closeQuantity)
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        (
            uint256 inputRedeems,
            uint256 inputOptions,
            uint256 outUnderlyings
        ) = WethRouterLib.safeCloseForETH(
            weth,
            optionToken,
            closeQuantity,
            receiver
        );
        emit WethConnectorClose(msg.sender, address(optionToken), inputOptions);
        return (inputRedeems, inputOptions, outUnderlyings);
    }

    /**
     * @dev Burn redeemTokens to withdraw underlyingTokens (ethers) from expired options.
     * This function is for options with WETH as the underlying asset.
     * The underlyingTokens are WETH, which are converted to ethers prior to being sent to receiver.
     * @param optionToken The address of the option contract.
     * @param unwindQuantity Quantity of underlyingTokens (ethers) to withdraw.
     * @param receiver The underlyingTokens (ethers) are sent to the receiver address.
     */
    function safeUnwindForETH(
        IOption optionToken,
        uint256 unwindQuantity,
        address receiver
    )
        external
        override
        nonReentrant
        nonZero(unwindQuantity)
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        (
            uint256 inputRedeems,
            uint256 inputOptions,
            uint256 outUnderlyings
        ) = WethRouterLib.safeUnwindForETH(
            weth,
            optionToken,
            unwindQuantity,
            receiver
        );

        emit WethConnectorUnwind(
            msg.sender,
            address(optionToken),
            inputOptions
        );
        return (inputRedeems, inputOptions, outUnderlyings);
    }
}
