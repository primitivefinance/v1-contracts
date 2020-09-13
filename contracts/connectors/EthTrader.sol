// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

/**
 * @title   EthEthTrader
 * @notice  Abstracts the interfacing with the protocol's option contract for ease-of-use. Converts ether to WETH for WETH option operations.
 * @author  Primitive
 */

import { IOption } from "../option/interfaces/IOption.sol";
import { TraderLib } from "../option/libraries/TraderLib.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IEthTrader } from "./IEthTrader.sol";
import { IWETH } from "./IWETH.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@nomiclabs/buidler/console.sol";

contract EthTrader is IEthTrader, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IWETH public weth;

    event EthTraderMint(
        address indexed from,
        address indexed option,
        uint256 outputOptions,
        uint256 outputRedeems
    );
    event EthTraderExercise(
        address indexed from,
        address indexed option,
        uint256 outUnderlyings,
        uint256 inStrikes
    );
    event EthTraderRedeem(
        address indexed from,
        address indexed option,
        uint256 inRedeems
    );
    event EthTraderClose(
        address indexed from,
        address indexed option,
        uint256 inOptions
    );

    event EthTraderUnwind(
        address indexed from,
        address indexed option,
        uint256 inOptions
    );

    constructor(address payable _weth) public {
        weth = IWETH(_weth);
    }

    receive() external payable {
        assert(msg.sender == address(weth)); // only accept ETH via fallback from the WETH contract
    }

    /**
     * @dev Conducts important safety checks to safely mint WETH option tokens.
     * @param optionToken The address of the option token to mint.
     * @param mintQuantity The quantity of option tokens to mint.
     * @param receiver The address which receives the minted option tokens.
     */
    function safeEthMint(
        IOption optionToken,
        uint256 mintQuantity,
        address receiver
    ) external override payable nonReentrant returns (uint256, uint256) {
        // Revert if mintQuantity is 0.
        require(mintQuantity > 0, "ERR_ZERO");

        // Check to make sure the mintQuantity requested matches the value sent.
        require(msg.value == mintQuantity, "ERR_UNEQUAL_VALUE");

        // Check to make sure we are minting a WETH call option.
        address underlyingAddress = optionToken.getUnderlyingTokenAddress();
        require(address(weth) == underlyingAddress, "ERR_NOT_WETH");

        depositEthSendWeth(address(optionToken), mintQuantity);

        // Mint the option and redeem tokens.
        (uint256 outputOptions, uint256 outputRedeems) = optionToken
            .mintOptions(receiver);
        emit EthTraderMint(
            msg.sender,
            address(optionToken),
            outputOptions,
            outputRedeems
        );
        return (outputOptions, outputRedeems);
    }

    /**
     * @dev Swaps strikeTokens to underlyingTokens using the strike ratio as the exchange rate.
     * @notice Burns optionTokens, option contract receives strikeTokens, user receives underlyingTokens.
     * @param optionToken The address of the option contract.
     * @param exerciseQuantity Quantity of optionTokens to exercise.
     * @param receiver The underlyingTokens are sent to the receiver address.
     */
    function safeEthExercise(
        IOption optionToken,
        uint256 exerciseQuantity,
        address receiver
    ) external override payable nonReentrant returns (uint256, uint256) {
        // Require one of the option's assets to be WETH.
        address underlyingAddress = optionToken.getUnderlyingTokenAddress();
        address strikeAddress = optionToken.getStrikeTokenAddress();
        require(
            underlyingAddress == address(weth) ||
                strikeAddress == address(weth),
            "ERR_NOT_WETH"
        );

        // Require exercise quantity to not be zero and for the msg.sender to have the options to exercise.
        require(exerciseQuantity > 0, "ERR_ZERO");
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >=
                exerciseQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate quantity of strikeTokens needed to exercise quantity of optionTokens.
        uint256 inputStrikes = exerciseQuantity
            .mul(optionToken.getQuoteValue())
            .div(optionToken.getBaseValue());

        // If the underlying is WETH, then pay normal ERC-20 strike tokens.
        if (underlyingAddress == address(weth)) {
            require(
                IERC20(strikeAddress).balanceOf(msg.sender) >= inputStrikes,
                "ERR_BAL_STRIKE"
            );
            IERC20(strikeAddress).safeTransferFrom(
                msg.sender,
                address(optionToken),
                inputStrikes
            );
        } else {
            // Else, the strike address is WETH. Convert msg.value to WETH to pay strike.
            require(msg.value >= inputStrikes, "ERR_BAL_STRIKE");
            depositEthSendWeth(address(optionToken), inputStrikes);
        }

        // Send the option tokens to prepare for calling exerciseOptions().
        IERC20(address(optionToken)).safeTransferFrom(
            msg.sender,
            address(optionToken),
            exerciseQuantity
        );

        uint256 inputOptions;
        (inputStrikes, inputOptions) = optionToken.exerciseOptions(
            address(this),
            exerciseQuantity,
            new bytes(0)
        );

        // If underlying is WETH, convert WETH to ETH then send ETH.
        if (underlyingAddress == address(weth)) {
            withdrawEthAndSend(receiver, exerciseQuantity);
        }

        emit EthTraderExercise(
            msg.sender,
            address(optionToken),
            exerciseQuantity,
            inputStrikes
        );
        return (inputStrikes, inputOptions);
    }

    /**
     * @dev Burns redeemTokens to withdraw available strikeTokens.
     * @notice inputRedeems = outputStrikes.
     * @param optionToken The address of the option contract.
     * @param redeemQuantity redeemQuantity of redeemTokens to burn.
     * @param receiver The strikeTokens are sent to the receiver address.
     */
    function safeEthRedeem(
        IOption optionToken,
        uint256 redeemQuantity,
        address receiver
    ) external override payable nonReentrant returns (uint256) {
        // Require strike token to be WETH.
        address strikeAddress = optionToken.getStrikeTokenAddress();
        address redeemAddress = optionToken.redeemToken();
        require(strikeAddress == address(weth), "ERR_NOT_WETH");
        require(redeemQuantity > 0, "ERR_ZERO");
        require(
            IERC20(redeemAddress).balanceOf(msg.sender) >= redeemQuantity,
            "ERR_BAL_REDEEM"
        );
        // There can be the case there is no available strikes to redeem, causing a revert.
        IERC20(redeemAddress).safeTransferFrom(
            msg.sender,
            address(optionToken),
            redeemQuantity
        );
        uint256 inputRedeems = optionToken.redeemStrikeTokens(address(this));

        withdrawEthAndSend(receiver, redeemQuantity);
        emit EthTraderRedeem(msg.sender, address(optionToken), inputRedeems);
        return inputRedeems;
    }

    /**
     * @dev Burn optionTokens and redeemTokens to withdraw underlyingTokens.
     * @notice The redeemTokens to burn is equal to the optionTokens * strike ratio.
     * inputOptions = inputRedeems / strike ratio = outUnderlyings
     * @param optionToken The address of the option contract.
     * @param closeQuantity Quantity of optionTokens to burn.
     * (Implictly will burn the strike ratio quantity of redeemTokens).
     * @param receiver The underlyingTokens are sent to the receiver address.
     */
    function safeEthClose(
        IOption optionToken,
        uint256 closeQuantity,
        address receiver
    )
        external
        override
        payable
        nonReentrant
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        // Check to make sure we are closing a WETH call option.
        address underlyingAddress = optionToken.getUnderlyingTokenAddress();
        require(address(weth) == underlyingAddress, "ERR_NOT_WETH");
        require(closeQuantity > 0, "ERR_ZERO");
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >= closeQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate the quantity of redeemTokens that need to be burned. (What we mean by Implicit).
        uint256 inputRedeems = closeQuantity
            .mul(optionToken.getQuoteValue())
            .div(optionToken.getBaseValue());
        require(
            IERC20(optionToken.redeemToken()).balanceOf(msg.sender) >=
                inputRedeems,
            "ERR_BAL_REDEEM"
        );
        IERC20(optionToken.redeemToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inputRedeems
        );
        IERC20(address(optionToken)).safeTransferFrom(
            msg.sender,
            address(optionToken),
            closeQuantity
        );

        uint256 inputOptions;
        uint256 outUnderlyings;
        (inputRedeems, inputOptions, outUnderlyings) = optionToken.closeOptions(
            address(this)
        );
        withdrawEthAndSend(receiver, closeQuantity);
        emit EthTraderClose(msg.sender, address(optionToken), inputOptions);
        return (inputRedeems, inputOptions, outUnderlyings);
    }

    /**
     * @dev Burn redeemTokens to withdraw underlyingTokens and strikeTokens from expired options.
     * @param optionToken The address of the option contract.
     * @param unwindQuantity Quantity of option tokens used to calculate the amount of redeem tokens to burn.
     * @param receiver The underlyingTokens are sent to the receiver address and the redeemTokens are burned.
     */
    function safeEthUnwind(
        IOption optionToken,
        uint256 unwindQuantity,
        address receiver
    )
        external
        override
        payable
        nonReentrant
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        // Check to make sure we are closing a WETH call option.
        address underlyingAddress = optionToken.getUnderlyingTokenAddress();
        require(address(weth) == underlyingAddress, "ERR_NOT_WETH");

        // Checks
        require(unwindQuantity > 0, "ERR_ZERO");
        // solhint-disable-next-line not-rely-on-time
        require(
            optionToken.getExpiryTime() < block.timestamp,
            "ERR_NOT_EXPIRED"
        );

        // Calculate amount of redeems required
        uint256 inputRedeems = unwindQuantity
            .mul(optionToken.getQuoteValue())
            .div(optionToken.getBaseValue());
        require(
            IERC20(optionToken.redeemToken()).balanceOf(msg.sender) >=
                inputRedeems,
            "ERR_BAL_REDEEM"
        );
        IERC20(optionToken.redeemToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inputRedeems
        );

        uint256 inputOptions;
        uint256 outUnderlyings;
        (inputRedeems, inputOptions, outUnderlyings) = optionToken.closeOptions(
            address(this)
        );
        withdrawEthAndSend(receiver, unwindQuantity);
        emit EthTraderUnwind(msg.sender, address(optionToken), inputOptions);
        return (inputRedeems, inputOptions, outUnderlyings);
    }

    function depositEthSendWeth(address to, uint256 quantity) internal {
        // Deposit the ethers received from msg.value into the WETH contract.
        weth.deposit.value(msg.value)();

        // Send WETH to option contract in preparation to call a core function.
        weth.transfer(to, quantity);
    }

    function withdrawEthAndSend(address to, uint256 quantity) internal {
        // Withdraw ethers with weth.
        weth.withdraw(quantity);

        // Send ether
        (bool success, ) = to.call.value(quantity)("");
        require(success, "ERR_SENDING_ETHER");
    }
}
