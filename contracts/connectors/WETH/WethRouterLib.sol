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
// Open Zeppelin
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

library WethRouterLib {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @dev Checks the quantity of an operation to make sure its not zero. Fails early.
     */
    modifier nonZero(uint256 quantity) {
        require(quantity > 0, "ERR_ZERO");
        _;
    }

    // ==== Operation Functions ====

    /**
     * @dev Mints msg.value quantity of options and "quote" (option parameter) quantity of redeem tokens.
     * @notice This function is for options that have WETH as the underlying asset.
     * @param optionToken The address of the option token to mint.
     * @param receiver The address which receives the minted option and redeem tokens.
     */
    function safeMintWithETH(
        IWETH weth,
        IOption optionToken,
        address receiver
    ) internal nonZero(msg.value) returns (uint256, uint256) {
        // Check to make sure we are minting a WETH call option.
        address underlyingAddress = optionToken.getUnderlyingTokenAddress();
        require(address(weth) == underlyingAddress, "ERR_NOT_WETH");

        // Convert ethers into WETH, then send WETH to option contract in preparation of calling mintOptions().
        _depositEthSendWeth(weth, address(optionToken));

        // Mint the option and redeem tokens.
        (uint256 outputOptions, uint256 outputRedeems) = optionToken
            .mintOptions(receiver);

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
    function safeExerciseWithETH(
        IWETH weth,
        IOption optionToken,
        address receiver
    ) internal nonZero(msg.value) returns (uint256, uint256) {
        // Require one of the option's assets to be WETH.
        address strikeAddress = optionToken.getStrikeTokenAddress();
        require(strikeAddress == address(weth), "ERR_NOT_WETH");

        uint256 inputStrikes = msg.value;
        // Calculate quantity of optionTokens needed to burn.
        // An ether put option with strike price $300 has a "base" value of 300, and a "quote" value of 1.
        // To calculate how many options are needed to be burned, we need to cancel out the "quote" units.
        // The input strike quantity can be multiplied by the strike ratio to cancel out "quote" units.
        // 1 ether (quote units) * 300 (base units) / 1 (quote units) = 300 inputOptions
        uint256 inputOptions = inputStrikes.mul(optionToken.getBaseValue()).div(
            optionToken.getQuoteValue()
        );

        // Fail early if msg.sender does not have enough optionTokens to burn.
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >= inputOptions,
            "ERR_BAL_OPTIONS"
        );

        // Wrap the ethers into WETH, and send the WETH to the option contract to prepare for calling exerciseOptions().
        _depositEthSendWeth(weth, address(optionToken));

        // Send the option tokens required to prepare for calling exerciseOptions().
        IERC20(address(optionToken)).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inputOptions
        );

        // Burns the transferred option tokens, stores the strike asset (ether), and pushes underlyingTokens
        // to the receiver address.
        (inputStrikes, inputOptions) = optionToken.exerciseOptions(
            receiver,
            inputOptions,
            new bytes(0)
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
        IWETH weth,
        IOption optionToken,
        uint256 exerciseQuantity,
        address receiver
    ) internal nonZero(exerciseQuantity) returns (uint256, uint256) {
        // Require one of the option's assets to be WETH.
        address underlyingAddress = optionToken.getUnderlyingTokenAddress();
        address strikeAddress = optionToken.getStrikeTokenAddress();
        require(underlyingAddress == address(weth), "ERR_NOT_WETH");

        // Fails early if msg.sender does not have enough optionTokens.
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >=
                exerciseQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate quantity of strikeTokens needed to exercise quantity of optionTokens.
        uint256 inputStrikes = exerciseQuantity
            .mul(optionToken.getQuoteValue())
            .div(optionToken.getBaseValue());

        // Fails early if msg.sender does not have enough strikeTokens.
        require(
            IERC20(strikeAddress).balanceOf(msg.sender) >= inputStrikes,
            "ERR_BAL_STRIKE"
        );

        // Send strikeTokens to option contract to prepare for calling exerciseOptions().
        IERC20(strikeAddress).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inputStrikes
        );

        // Send the option tokens to prepare for calling exerciseOptions().
        IERC20(address(optionToken)).safeTransferFrom(
            msg.sender,
            address(optionToken),
            exerciseQuantity
        );

        // Burns the optionTokens sent, stores the strikeTokens sent, and pushes underlyingTokens
        // to this contract.
        uint256 inputOptions;
        (inputStrikes, inputOptions) = optionToken.exerciseOptions(
            address(this),
            exerciseQuantity,
            new bytes(0)
        );

        // Converts the withdrawn WETH to ethers, then sends the ethers to the receiver address.
        _withdrawEthAndSend(weth, receiver, exerciseQuantity);

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
        IWETH weth,
        IOption optionToken,
        uint256 redeemQuantity,
        address receiver
    ) internal nonZero(redeemQuantity) returns (uint256) {
        // Require strikeToken to be WETH.
        address strikeAddress = optionToken.getStrikeTokenAddress();
        require(strikeAddress == address(weth), "ERR_NOT_WETH");

        // Fail early if msg.sender does not have enough redeemTokens.
        address redeemAddress = optionToken.redeemToken();
        require(
            IERC20(redeemAddress).balanceOf(msg.sender) >= redeemQuantity,
            "ERR_BAL_REDEEM"
        );

        // Send redeemTokens to option contract in preparation for calling redeemStrikeTokens().
        IERC20(redeemAddress).safeTransferFrom(
            msg.sender,
            address(optionToken),
            redeemQuantity
        );

        // If options have not been exercised, there will be no strikeTokens to redeem, causing a revert.
        // Burns the redeem tokens that were sent to the contract, and withdraws the same quantity of WETH.
        // Sends the withdrawn WETH to this contract, so that it can be unwrapped prior to being sent to receiver.
        uint256 inputRedeems = optionToken.redeemStrikeTokens(address(this));

        // Unwrap the redeemed WETH and then send the ethers to the receiver.
        _withdrawEthAndSend(weth, receiver, redeemQuantity);

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
        IWETH weth,
        IOption optionToken,
        uint256 closeQuantity,
        address receiver
    )
        internal
        nonZero(closeQuantity)
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        // Require the optionToken to have WETH as the underlying asset.
        address underlyingAddress = optionToken.getUnderlyingTokenAddress();
        require(address(weth) == underlyingAddress, "ERR_NOT_WETH");

        // Fail early if msg.sender does not have enough optionTokens to burn.
        require(
            IERC20(address(optionToken)).balanceOf(msg.sender) >= closeQuantity,
            "ERR_BAL_OPTIONS"
        );

        // Calculate the quantity of redeemTokens that need to be burned.
        uint256 inputRedeems = closeQuantity
            .mul(optionToken.getQuoteValue())
            .div(optionToken.getBaseValue());

        // Fail early is msg.sender does not have enough redeemTokens to burn.
        require(
            IERC20(optionToken.redeemToken()).balanceOf(msg.sender) >=
                inputRedeems,
            "ERR_BAL_REDEEM"
        );

        // Send redeem and option tokens in preparation of calling closeOptions().
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

        // Call the closeOptions() function to burn option and redeem tokens and withdraw underlyingTokens.
        uint256 inputOptions;
        uint256 outUnderlyings;
        (inputRedeems, inputOptions, outUnderlyings) = optionToken.closeOptions(
            address(this)
        );

        // Since underlyngTokens are WETH, unwrap them then send the ethers to the receiver.
        _withdrawEthAndSend(weth, receiver, closeQuantity);

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
        IWETH weth,
        IOption optionToken,
        uint256 unwindQuantity,
        address receiver
    )
        internal
        nonZero(unwindQuantity)
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        // Require the optionToken to have WETH as the underlying asset.
        address underlyingAddress = optionToken.getUnderlyingTokenAddress();
        require(address(weth) == underlyingAddress, "ERR_NOT_WETH");

        // If the option is not expired, fail early.
        // solhint-disable-next-line not-rely-on-time
        require(optionToken.getExpiryTime() < now, "ERR_NOT_EXPIRED");

        // Calculate the quantity of redeemTokens that need to be burned.
        uint256 inputRedeems = unwindQuantity
            .mul(optionToken.getQuoteValue())
            .div(optionToken.getBaseValue());

        // Fail early if msg.sender does not have enough redeemTokens to burn.
        require(
            IERC20(optionToken.redeemToken()).balanceOf(msg.sender) >=
                inputRedeems,
            "ERR_BAL_REDEEM"
        );

        // Send redeem in preparation of calling closeOptions().
        IERC20(optionToken.redeemToken()).safeTransferFrom(
            msg.sender,
            address(optionToken),
            inputRedeems
        );

        // Call the closeOptions() function to burn redeem tokens and withdraw underlyingTokens.
        uint256 inputOptions;
        uint256 outUnderlyings;
        (inputRedeems, inputOptions, outUnderlyings) = optionToken.closeOptions(
            address(this)
        );

        // Since underlyngTokens are WETH, unwrap them to ethers then send the ethers to the receiver.
        _withdrawEthAndSend(weth, receiver, unwindQuantity);
        return (inputRedeems, inputOptions, outUnderlyings);
    }

    // ==== WETH Operations ====

    /**
     * @dev Deposits msg.value of ethers into WETH contract. Then sends WETH to "to".
     * @param to The address to send WETH ERC-20 tokens to.
     */
    function _depositEthSendWeth(IWETH weth, address to) internal {
        // Deposit the ethers received from msg.value into the WETH contract.
        weth.deposit.value(msg.value)();

        // Send WETH.
        weth.transfer(to, msg.value);
    }

    /**
     * @dev Unwraps WETH to withrdaw ethers, which are then sent to the "to" address.
     * @param to The address to send withdrawn ethers to.
     * @param quantity The quantity of WETH to unwrap.
     */
    function _withdrawEthAndSend(
        IWETH weth,
        address to,
        uint256 quantity
    ) internal {
        // Withdraw ethers with weth.
        weth.withdraw(quantity);

        // Send ether.
        (bool success, ) = to.call.value(quantity)("");

        // Revert is call is unsuccessful.
        require(success, "ERR_SENDING_ETHER");
    }
}
