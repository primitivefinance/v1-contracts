pragma solidity >=0.6.2;

/**
 * @title Clearing House for cash-settled options.
 * @notice Manages synthetic asset and debt balances.
 * @author Primitive
 */

// Primitive
import { SERC20, IERC20 } from "./SERC20.sol";
import { IOption } from "../option/interfaces/IOption.sol";
import { IRegistry } from "../option/interfaces/IRegistry.sol";

// Open Zeppelin
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract ClearingHouse {
    using SafeERC20 for IERC20;
    using SafeERC20 for IOption;
    using SafeMath for uint256;

    event SyntheticMinted(
        address indexed from,
        address indexed optionAddress,
        uint256 quantity
    );

    IERC20 public baseToken;
    IERC20 public quoteToken;

    IRegistry public registry;

    mapping(address => address) public syntheticOptions;

    constructor() public {}

    // Initialize self
    function intializeSelf(address registry_) external {
        registry = IRegistry(registry_);
        baseToken = new SERC20();
        baseToken.initialize(address(this));
        quoteToken = new SERC20();
        quoteToken.initialize(address(this));
    }

    // Initialize a synthetic option
    function deploySyntheticOption(address optionAddress)
        public
        returns (address)
    {
        (, , uint256 baseValue, uint256 quoteValue, uint256 expiry) = IOption(
            optionAddress
        )
            .getParameters();
        address syntheticOption = registry.deployOption(
            address(baseToken),
            address(quoteToken),
            baseValue,
            quoteValue,
            expiry
        );

        syntheticOptions[optionAddress] = syntheticOption;
        return syntheticOption;
    }

    // Open an account

    // Position operations

    function openDebitSpread(
        address longOption,
        address shortOption,
        uint256 quantity,
        address receiver
    ) external {
        // assume these are calls for now
        IOption syntheticLong = IOption(syntheticOptions[longOption]);
        IOption syntheticShort = IOption(syntheticOptions[shortOption]);

        // Check to make sure long option sufficiently covers short option.
        uint256 longStrike = syntheticLong.getQuoteValue();
        uint256 shortStrike = syntheticShort.getQuoteValue();
        require(shortStrike >= longStrike, "ERR_CREDIT_SPREAD");

        // e.g. short a 500 call and long a 400 call. 100 strike difference.
        uint256 strikeDifference = shortStrike.sub(longStrike);

        // Mint synthetic tokens to the synthetic short option.
        baseToken.mint(address(syntheticShort), quantity);

        // Mint synthetic option and redeem tokens to this contract.
        syntheticShort.mintOptions(address(this));

        // Send out synthetic option tokens.
        syntheticShort.transfer(receiver, quantity);

        // Send out strikeDifference quantity of synthetic redeem tokens.
        IERC20(syntheticShort.redeemToken()).transfer(
            receiver,
            strikeDifference
        );

        // Pull in the original long option.
        syntheticLong.safeTransferFrom(msg.sender, address(this), quantity);

        // Final balance sheet:
        //
        // Clearing House
        // Quantity# of long option tokens
        // strikeDiff# of synthetic short option (redeem) tokens
        //
        // Receiver
        // Quantity# of synthetic long option tokens (which can then be sold)
        // 1 - strikeDiff# of synthetic short option (redeem) tokens
    }

    // Option operations

    function syntheticMint(
        address optionAddress,
        uint256 quantity,
        address receiver
    ) external {
        address syntheticOption = syntheticOptions[optionAddress];
        require(syntheticOption != address(0x0), "ERR_NOT_DEPLOYED");

        // Mint synthetic tokens to the synthetic option contract.
        baseToken.mint(syntheticOption, quantity);

        // Call mintOptions and send options to the receiver address.
        IOption(syntheticOption).mintOptions(receiver);

        // Pull real tokens to this contract.
        address underlying = IOption(optionAddress).getUnderlyingTokenAddress();
        _pullTokens(underlying, quantity);

        emit SyntheticMinted(msg.sender, optionAddress, quantity);
    }

    function syntheticExercise(
        address optionAddress,
        uint256 quantity,
        address receiver
    ) external {
        address syntheticOption = syntheticOptions[optionAddress];
        require(syntheticOption != address(0x0), "ERR_NOT_DEPLOYED");

        // Move synthetic options from msg.sender to synthetic option contract itself.
        IERC20(syntheticOption).safeTransferFrom(
            msg.sender,
            syntheticOption,
            quantity
        );

        // Calculate strike tokens needed to exercise.
        uint256 amountStrikeTokens = calculateStrikePayment(
            optionAddress,
            quantity
        );

        // Mint required strike tokens to the synthetic option in preparation of calling exerciseOptions().
        quoteToken.mint(syntheticOption, amountStrikeTokens);

        // Call exerciseOptions and send underlying tokens to this contract.
        IOption(syntheticOption).exericseOptions(address(this));

        // Burn the synthetic underlying tokens.
        baseToken.burn(address(this), quantity);

        // Push real underlying tokens to receiver.
        IERC20(IOption(optionAddress).getUnderlyingTokenAddress()).safeTransfer(
            receiver,
            quantity
        );

        // Pull real strike tokens to this contract.
        IERC20(IOption(optionAddress).getStrikeTokenAddress()).safeTransferFrom(
            msg.sender,
            address(this),
            amountStrikeTokens
        );
    }

    function calculateStrikePayment(address optionAddress, uint256 quantity)
        public
        view
        returns (uint256)
    {
        uint256 baseValue = IOption(optionAddress).getBaseValue();
        uint256 quoteValue = IOption(optionAddress).getQuoteValue();

        // Parameter `quantity` is in units of baseValue. Convert it into units of quoteValue.
        uint256 calculatedValue = quantity.mul(quoteValue).div(baseValue);
        return calculatedValue;
    }

    function _pullTokens(address token, uint256 quantity) internal {
        IERC20(token).safeTransferFrom(msg.sender, address(this), quantity);
    }
}
