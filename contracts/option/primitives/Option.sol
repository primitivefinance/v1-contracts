// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

/**
 * @title   Vanilla Option Token
 * @notice  This is a low-level contract that is designed to be interacted with by
 *          other sophisticated smart contracts which have important safety checks,
 *          and not by externally owned accounts.
 *          Incorrect usage through direct interaction from externally owned accounts
 *          can lead to the loss of funds.
 *          Use Primitive's Trader.sol contract to interact with this contract safely.
 * @author  Primitive
 */

import { IOption } from "../interfaces/IOption.sol";
import { IRedeem } from "../interfaces/IRedeem.sol";
import { IFlash } from "../interfaces/IFlash.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20 } from "./ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract Option is IOption, ERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct OptionParameters {
        address underlyingToken;
        address strikeToken;
        uint256 base;
        uint256 quote;
        uint256 expiry;
    }

    OptionParameters public optionParameters;

    // solhint-disable-next-line const-name-snakecase
    uint256 public override underlyingCache;
    uint256 public override strikeCache;
    address public override redeemToken;
    address public override factory;
    bool private _notEntered;

    string public constant name = "Primitive V1 Option";
    string public constant symbol = "PRM";
    uint8 public constant decimals = 18;

    event Mint(address indexed from, uint256 outOptions, uint256 outRedeems);
    event Exercise(
        address indexed from,
        uint256 outUnderlyings,
        uint256 inStrikes
    );
    event Redeem(address indexed from, uint256 inRedeems);
    event Close(address indexed from, uint256 outUnderlyings);
    event UpdatedCacheBalances(uint256 underlyingCache, uint256 strikeCache);
    event InitializedRedeem(
        address indexed caller,
        address indexed redeemToken
    );

    // solhint-disable-next-line no-empty-blocks
    constructor() public {}

    /**
     * @dev Sets the intial state for the contract. Only called immediately after deployment.
     * @param underlyingToken The address of the underlying asset.
     * @param strikeToken The address of the strike asset.
     * @param base The quantity of underlying tokens per quote amount of strike tokens.
     * @param quote The quantity of strike tokens per base amount of underlying tokens.
     * @param expiry The expiration date for the option.
     */
    function initialize(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) public {
        require(factory == address(0x0), "ERR_IS_INITIALIZED");
        require(underlyingToken != strikeToken, "ERR_SAME_ASSETS");
        require(base > 0, "ERR_BASE_ZERO");
        require(quote > 0, "ERR_QUOTE_ZERO");
        require(expiry >= block.timestamp, "ERR_EXPIRY");
        factory = msg.sender;
        optionParameters = OptionParameters(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        _notEntered = true;
    }

    modifier notExpired {
        // solhint-disable-next-line not-rely-on-time
        require(isNotExpired(), "ERR_EXPIRED");
        _;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and make it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_notEntered, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _notEntered = false;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _notEntered = true;
    }

    /**
     * @dev Called after the option contract is initialized, and a redeem token has been deployed.
     * @notice Entangles a redeem token to this option contract permanently.
     * @param redeemToken_ The address of the redeem token.
     */
    function initRedeemToken(address redeemToken_) external override {
        require(msg.sender == factory, "ERR_NOT_OWNER");
        require(redeemToken == address(0x0), "ERR_REDEEM_INITIALIZED");
        redeemToken = redeemToken_;
        emit InitializedRedeem(msg.sender, redeemToken_);
    }

    /**
     * @dev Updates the cached balances to match the actual current balances.
     * Attempting to transfer tokens to this contract directly, in a separate transaction,
     * is incorrect and could result in loss of funds. Calling this function will permanently lock any excess
     * underlying or strike tokens which were erroneously sent to this contract.
     */
    function updateCacheBalances() external override nonReentrant {
        _updateCacheBalances(
            IERC20(optionParameters.underlyingToken).balanceOf(address(this)),
            IERC20(optionParameters.strikeToken).balanceOf(address(this))
        );
    }

    /**
     * @dev Sets the cache balances to new values.
     */
    function _updateCacheBalances(
        uint256 underlyingBalance,
        uint256 strikeBalance
    ) private {
        underlyingCache = underlyingBalance;
        strikeCache = strikeBalance;
        emit UpdatedCacheBalances(underlyingBalance, strikeBalance);
    }

    /* === STATE MUTABLE === */

    /**
     * @dev Warning: This low-level function should be called from a contract which performs important safety checks.
     * This function should never be called directly by an externally owned account.
     * A sophsticated smart contract should make the important checks to make sure the correct amount of tokens
     * are transferred into this contract prior to the function call. If an incorrect amount of tokens are transferred
     * into this contract, and this function is called, it can result in the loss of funds.
     * Mints optionTokens at a 1:1 ratio to underlyingToken deposits. Also mints Redeem tokens at a base:quote ratio.
     * @notice inUnderlyings = outOptionTokens. inUnderlying / strike ratio = outRedeemTokens.
     * @param receiver The newly minted tokens are sent to the receiver address.
     */
    function mintOptions(address receiver)
        external
        override
        nonReentrant
        notExpired
        returns (uint256, uint256)
    {
        // Save on gas because this variable is used twice.
        uint256 underlyingBalance = IERC20(optionParameters.underlyingToken)
            .balanceOf(address(this));

        // Mint optionTokens equal to the difference between current and cached balance of underlyingTokens.
        uint256 inUnderlyings = underlyingBalance.sub(underlyingCache);

        // Calculate the quantity of redeemTokens to mint.
        uint256 outRedeems = inUnderlyings.mul(optionParameters.quote).div(
            optionParameters.base
        );
        require(outRedeems > 0, "ERR_ZERO");

        // Mint the optionTokens and redeemTokens.
        IRedeem(redeemToken).mint(receiver, outRedeems);
        _mint(receiver, inUnderlyings);

        // Update the underlyingCache.
        _updateCacheBalances(underlyingBalance, strikeCache);
        emit Mint(msg.sender, inUnderlyings, outRedeems);
        return (inUnderlyings, outRedeems);
    }

    /**
     * @dev Warning: This low-level function should be called from a contract which performs important safety checks.
     * This function should never be called directly by an externally owned account.
     * A sophsticated smart contract should make the important checks to make sure the correct amount of tokens
     * are transferred into this contract prior to the function call. If an incorrect amount of tokens are transferred
     * into this contract, and this function is called, it can result in the loss of funds.
     * Sends out underlyingTokens then checks to make sure they are returned or paid for.
     * This function enables flash exercises and flash loans. Only smart contracts who implement
     * their own IFlash interface should be calling this function to initiate a flash exercise/loan.
     * @notice If the underlyingTokens are returned, only the fee has to be paid.
     * @param receiver The outUnderlyings are sent to the receiver address.
     * @param outUnderlyings Quantity of underlyingTokens to safeTransfer to receiver optimistically.
     * @param data Passing in any abritrary data will trigger the flash exercise callback function.
     */
    function exerciseOptions(
        address receiver,
        uint256 outUnderlyings,
        bytes calldata data
    ) external override nonReentrant notExpired returns (uint256, uint256) {
        // Store the cached balances and token addresses in memory.
        address underlyingToken = optionParameters.underlyingToken;
        //(uint256 _underlyingCache, uint256 _strikeCache) = getCacheBalances();

        // Require outUnderlyings > 0 and balance of underlyings >= outUnderlyings.
        require(outUnderlyings > 0, "ERR_ZERO");
        require(
            IERC20(underlyingToken).balanceOf(address(this)) >= outUnderlyings,
            "ERR_BAL_UNDERLYING"
        );

        // Optimistically safeTransfer out underlyingTokens.
        IERC20(underlyingToken).safeTransfer(receiver, outUnderlyings);
        if (data.length > 0)
            IFlash(receiver).primitiveFlash(msg.sender, outUnderlyings, data);

        // Store in memory for gas savings.
        uint256 strikeBalance = IERC20(optionParameters.strikeToken).balanceOf(
            address(this)
        );
        uint256 underlyingBalance = IERC20(underlyingToken).balanceOf(
            address(this)
        );

        // Calculate the differences.
        uint256 inStrikes = strikeBalance.sub(strikeCache);
        uint256 inUnderlyings = underlyingBalance.sub(
            underlyingCache.sub(outUnderlyings)
        ); // will be > 0 if underlyingTokens are returned.

        // Either underlyingTokens or strikeTokens must be sent into the contract.
        require(inStrikes > 0 || inUnderlyings > 0, "ERR_ZERO");

        // Calculate the remaining amount of underlyingToken that needs to be paid for.
        uint256 remainder = inUnderlyings > outUnderlyings
            ? 0
            : outUnderlyings.sub(inUnderlyings);

        // Calculate the expected payment of strikeTokens.
        uint256 payment = remainder.mul(optionParameters.quote).div(
            optionParameters.base
        );

        // Assumes the cached optionToken balance is 0, which is what it should be.
        uint256 inOptions = balanceOf(address(this));

        // Enforce the invariants.
        require(inStrikes >= payment, "ERR_STRIKES_INPUT");
        require(inOptions >= remainder, "ERR_OPTIONS_INPUT");

        // Burn the optionTokens at a 1:1 ratio to outUnderlyings.
        _burn(address(this), inOptions);

        // Update the cached balances.
        _updateCacheBalances(underlyingBalance, strikeBalance);
        emit Exercise(msg.sender, outUnderlyings, inStrikes);
        return (inStrikes, inOptions);
    }

    /**
     * @dev Warning: This low-level function should be called from a contract which performs important safety checks.
     * This function should never be called directly by an externally owned account.
     * A sophsticated smart contract should make the important checks to make sure the correct amount of tokens
     * are transferred into this contract prior to the function call. If an incorrect amount of tokens are transferred
     * into this contract, and this function is called, it can result in the loss of funds.
     * Burns redeemTokens to withdraw strikeTokens at a ratio of 1:1.
     * @notice inRedeemTokens = outStrikeTokens. Only callable when strikeTokens are in the contract.
     * @param receiver The inRedeems quantity of strikeTokens are sent to the receiver address.
     */
    function redeemStrikeTokens(address receiver)
        external
        override
        nonReentrant
        returns (uint256)
    {
        address strikeToken = optionParameters.strikeToken;
        address _redeemToken = redeemToken;
        uint256 strikeBalance = IERC20(strikeToken).balanceOf(address(this));
        uint256 inRedeems = IERC20(_redeemToken).balanceOf(address(this));

        // Difference between redeemTokens balance and cache.
        require(inRedeems > 0, "ERR_ZERO");
        require(strikeBalance >= inRedeems, "ERR_BAL_STRIKE");

        // Burn redeemTokens in the contract. Send strikeTokens to receiver.
        IRedeem(_redeemToken).burn(address(this), inRedeems);
        IERC20(strikeToken).safeTransfer(receiver, inRedeems);

        // Current balances.
        strikeBalance = IERC20(strikeToken).balanceOf(address(this));

        // Update the cached balances.
        _updateCacheBalances(underlyingCache, strikeBalance);
        emit Redeem(msg.sender, inRedeems);
        return inRedeems;
    }

    /**
     * @dev Warning: This low-level function should be called from a contract which performs important safety checks.
     * This function should never be called directly by an externally owned account.
     * A sophsticated smart contract should make the important checks to make sure the correct amount of tokens
     * are transferred into this contract prior to the function call. If an incorrect amount of tokens are transferred
     * into this contract, and this function is called, it can result in the loss of funds.
     * If the option has expired, burn redeem tokens to withdraw underlying tokens.
     * If the option is not expired, burn option and redeem tokens to withdraw underlying tokens.
     * @notice inRedeemTokens / strike ratio = outUnderlyingTokens && inOptionTokens >= outUnderlyingTokens.
     * @param receiver The outUnderlyingTokens are sent to the receiver address.
     */
    function closeOptions(address receiver)
        external
        override
        nonReentrant
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        // Stores addresses and balances locally for gas savings.
        address underlyingToken = optionParameters.underlyingToken;
        address _redeemToken = redeemToken;
        uint256 underlyingBalance = IERC20(underlyingToken).balanceOf(
            address(this)
        );
        uint256 optionBalance = balanceOf(address(this));
        uint256 inRedeems = IERC20(_redeemToken).balanceOf(address(this));

        // The quantity of underlyingToken to send out it still determined by the quantity of inRedeems.
        // inRedeems is in units of strikeTokens, which is converted to underlyingTokens
        // by multiplying inRedeems by the strike ratio, which is base / quote.
        // This outUnderlyings quantity is checked against inOptions.
        // inOptions must be greater than or equal to outUnderlyings (1 option burned per 1 underlying purchased).
        // optionBalance must be greater than or equal to outUnderlyings.
        // Neither inRedeems or inOptions can be zero.
        uint256 outUnderlyings = inRedeems.mul(optionParameters.base).div(
            optionParameters.quote
        );

        // Assumes the cached balance is 0 so inOptions = balance of optionToken.
        // If optionToken is expired, optionToken does not need to be sent in. Only redeemToken.
        // solhint-disable-next-line not-rely-on-time
        uint256 inOptions = isNotExpired() ? optionBalance : outUnderlyings;
        require(inRedeems > 0 && inOptions > 0, "ERR_ZERO");
        require(
            inOptions >= outUnderlyings && underlyingBalance >= outUnderlyings,
            "ERR_BAL_UNDERLYING"
        );

        // Burn optionTokens. optionTokens are only sent into contract when not expired.
        // solhint-disable-next-line not-rely-on-time
        if (isNotExpired()) {
            _burn(address(this), inOptions);
        }

        // Send underlyingTokens to user.
        // Burn redeemTokens held in the contract.
        // User does not receive extra underlyingTokens if there was extra optionTokens in the contract.
        // User receives outUnderlyings proportional to inRedeems.
        IRedeem(_redeemToken).burn(address(this), inRedeems);
        IERC20(underlyingToken).safeTransfer(receiver, outUnderlyings);

        // Current balances of underlyingToken and redeemToken.
        underlyingBalance = IERC20(underlyingToken).balanceOf(address(this));

        // Update the cached balances.
        _updateCacheBalances(underlyingBalance, strikeCache);
        emit Close(msg.sender, outUnderlyings);
        return (inRedeems, inOptions, outUnderlyings);
    }

    /* === VIEW === */

    /**
     * @dev Returns the previously saved balances of underlying and strike tokens.
     */
    function getCacheBalances()
        public
        override
        view
        returns (uint256, uint256)
    {
        return (underlyingCache, strikeCache);
    }

    /**
     * @dev Returns the underlying, strike, and redeem token addresses.
     */
    function getAssetAddresses()
        public
        override
        view
        returns (
            address,
            address,
            address
        )
    {
        return (
            optionParameters.underlyingToken,
            optionParameters.strikeToken,
            redeemToken
        );
    }

    /**
     * @dev Returns the strike token address.
     */
    function getStrikeTokenAddress() public override view returns (address) {
        return optionParameters.strikeToken;
    }

    /**
     * @dev Returns the underlying token address.
     */
    function getUnderlyingTokenAddress()
        public
        override
        view
        returns (address)
    {
        return optionParameters.underlyingToken;
    }

    /**
     * @dev Returns the base value option parameter.
     */
    function getBaseValue() public override view returns (uint256) {
        return optionParameters.base;
    }

    /**
     * @dev Returns the quote value option parameter.
     */
    function getQuoteValue() public override view returns (uint256) {
        return optionParameters.quote;
    }

    /**
     * @dev Returns the expiry timestamp option parameter.
     */
    function getExpiryTime() public override view returns (uint256) {
        return optionParameters.expiry;
    }

    /**
     * @dev Returns the option parameters and redeem token address.
     */
    function getParameters()
        public
        override
        view
        returns (
            address _underlyingToken,
            address _strikeToken,
            address _redeemToken,
            uint256 _base,
            uint256 _quote,
            uint256 _expiry
        )
    {
        OptionParameters memory _optionParameters = optionParameters;
        _underlyingToken = _optionParameters.underlyingToken;
        _strikeToken = _optionParameters.strikeToken;
        _redeemToken = redeemToken;
        _base = _optionParameters.base;
        _quote = _optionParameters.quote;
        _expiry = _optionParameters.expiry;
    }

    /**
     * @dev Internal function to check if the option is expired.
     */
    function isNotExpired() internal view returns (bool) {
        return optionParameters.expiry >= block.timestamp;
    }
}
