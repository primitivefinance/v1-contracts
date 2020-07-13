// SPDX-License-Identifier: MIT







pragma solidity ^0.6.2;

/**
 * @title   Vanilla Option Token
 * @author  Primitive
 */

import { Primitives } from "../../Primitives.sol";
import { IOption } from "../interfaces/IOption.sol";
import { IRedeem } from "../interfaces/IRedeem.sol";
import { IFlash } from "../interfaces/IFlash.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

contract Option is IOption, ERC20, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    Primitives.Option public parameters;

    // solhint-disable-next-line const-name-snakecase
    uint256 public constant override EXERCISE_FEE = 1000;
    uint256 public override underlyingCache;
    uint256 public override strikeCache;
    address public override redeemToken;
    address public override factory;

    event Mint(address indexed from, uint256 outOptions, uint256 outRedeems);
    event Exercise(
        address indexed from,
        uint256 outUnderlyings,
        uint256 inStrikes
    );
    event Redeem(address indexed from, uint256 inRedeems);
    event Close(address indexed from, uint256 inOptions);
    event Fund(uint256 underlyingCache, uint256 strikeCache);

    // solhint-disable-next-line no-empty-blocks
    constructor() public ERC20("Primitive V1 Vanilla Option", "OPTION") {}

    function initialize(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) public {
        require(factory == address(0x0), "ERR_IS_INITIALIZED");
        factory = msg.sender;
        parameters = Primitives.Option(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
    }

    modifier notExpired {
        // solhint-disable-next-line not-rely-on-time
        require(parameters.expiry >= block.timestamp, "ERR_EXPIRED");
        _;
    }

    function initRedeemToken(address _redeemToken) external override {
        require(msg.sender == factory, "ERR_NOT_OWNER");
        redeemToken = _redeemToken;
    }

    function kill() external {
        require(msg.sender == factory, "ERR_NOT_OWNER");
        paused() ? _unpause() : _pause();
    }

    /**
     * @dev Updates the cached balances to the actual current balances.
     */
    function update() external nonReentrant {
        _fund(
            IERC20(parameters.underlyingToken).balanceOf(address(this)),
            IERC20(parameters.strikeToken).balanceOf(address(this))
        );
    }

    /**
     * @dev Difference between balances and caches is sent out so balances == caches.
     * Fixes underlyingToken, strikeToken, redeemToken, and optionToken balances.
     */
    function take() external nonReentrant {
        (
            address _underlyingToken,
            address _strikeToken,
            address _redeemToken
        ) = tokens();
        IERC20(_underlyingToken).safeTransfer(
            msg.sender,
            IERC20(_underlyingToken).balanceOf(address(this)).sub(
                underlyingCache
            )
        );
        IERC20(_strikeToken).safeTransfer(
            msg.sender,
            IERC20(_strikeToken).balanceOf(address(this)).sub(strikeCache)
        );
        IERC20(_redeemToken).safeTransfer(
            msg.sender,
            IERC20(_redeemToken).balanceOf(address(this))
        );
        IERC20(address(this)).safeTransfer(
            msg.sender,
            IERC20(address(this)).balanceOf(address(this))
        );
    }

    /**
     * @dev Sets the cache balances to new values.
     */
    function _fund(uint256 underlyingBalance, uint256 strikeBalance) private {
        underlyingCache = underlyingBalance;
        strikeCache = strikeBalance;
        emit Fund(underlyingBalance, strikeBalance);
    }

    /* === STATE MUTABLE === */

    /**
     * @dev Mints optionTokens at a 1:1 ratio to underlyingToken deposits.
     * @notice inUnderlyings = outOptions. inUnderlying / strike ratio = outRedeems.
     * @param receiver The newly minted tokens are sent to the receiver address.
     */
    function mint(address receiver)
        external
        override
        nonReentrant
        notExpired
        whenNotPaused
        returns (uint256 inUnderlyings, uint256 outRedeems)
    {
        // Save on gas because this variable is used twice.
        uint256 underlyingBalance = IERC20(parameters.underlyingToken)
            .balanceOf(address(this));

        // Mint optionTokens equal to the difference between current and cached balance of underlyingTokens.
        inUnderlyings = underlyingBalance.sub(underlyingCache);

        // Calculate the quantity of redeemTokens to mint.
        outRedeems = inUnderlyings.mul(parameters.quote).div(parameters.base);
        require(outRedeems > 0, "ERR_ZERO");

        // Mint the optionTokens and redeemTokens.
        IRedeem(redeemToken).mint(receiver, outRedeems);
        _mint(receiver, inUnderlyings);

        // Update the underlyingCache.
        _fund(underlyingBalance, strikeCache);
        emit Mint(receiver, inUnderlyings, outRedeems);
    }

    /**
     * @dev Sends out underlyingTokens then checks to make sure they are returned or paid for.
     * @notice If the underlyingTokens are returned, only the fee has to be paid.
     * @param receiver The outUnderlyings are sent to the receiver address.
     * @param outUnderlyings Quantity of underlyingTokens to safeTransfer to receiver optimistically.
     * @param data Passing in any abritrary data will trigger the flash exerise callback function.
     */
    function exercise(
        address receiver,
        uint256 outUnderlyings,
        bytes calldata data
    )
        external
        override
        nonReentrant
        notExpired
        whenNotPaused
        returns (uint256 inStrikes, uint256 inOptions)
    {
        // Store the cached balances and token addresses in memory.
        address underlyingToken = parameters.underlyingToken;
        (uint256 _underlyingCache, uint256 _strikeCache) = caches();

        // Require outUnderlyings > 0, and underlyingCache >= outUnderlyings.
        require(outUnderlyings > 0, "ERR_ZERO");
        require(
            IERC20(underlyingToken).balanceOf(address(this)) >= outUnderlyings,
            "ERR_BAL_UNDERLYING"
        );

        // Optimistically safeTransfer out underlyingTokens.
        IERC20(underlyingToken).safeTransfer(receiver, outUnderlyings);
        if (data.length > 0)
            IFlash(receiver).primitiveFlash(receiver, outUnderlyings, data);

        // Store in memory for gas savings.
        uint256 strikeBalance = IERC20(parameters.strikeToken).balanceOf(
            address(this)
        );
        uint256 underlyingBalance = IERC20(underlyingToken).balanceOf(
            address(this)
        );

        // Calculate the Differences.
        inStrikes = strikeBalance.sub(_strikeCache);
        uint256 inUnderlyings = underlyingBalance.sub(
            _underlyingCache.sub(outUnderlyings)
        ); // will be > 0 if underlyingTokens are returned.

        // Either underlyingTokens or strikeTokens must be sent into the contract.
        require(inStrikes > 0 || inUnderlyings > 0, "ERR_ZERO");

        // Add the fee to the total required payment.
        uint256 feeToPay = outUnderlyings.div(EXERCISE_FEE);

        // Calculate the remaining amount of underlyingToken that needs to be paid for.
        uint256 remainder = inUnderlyings > outUnderlyings
            ? 0
            : outUnderlyings.sub(inUnderlyings);

        // Calculate the expected payment of strikeTokens.
        uint256 payment = remainder.add(feeToPay).mul(parameters.quote).div(
            parameters.base
        );

        // Assumes the cached optionToken balance is 0, which is what it should be.
        inOptions = balanceOf(address(this));

        // Enforce the invariants.
        require(
            inStrikes >= payment && inOptions >= remainder,
            "ERR_BAL_INPUT"
        );

        // Burn the optionTokens at a 1:1 ratio to outUnderlyings.
        _burn(address(this), inOptions);

        // Update the cached balances.
        _fund(underlyingBalance, strikeBalance);
        emit Exercise(receiver, outUnderlyings, inStrikes);
    }

    /**
     * @dev Burns redeemTokens to withdraw strikeTokens at a ratio of 1:1.
     * @notice inRedeems = outStrikes. Only callable when strikeTokens are in the contract.
     * @param receiver The inRedeems quantity of strikeTokens are sent to the receiver address.
     */
    function redeem(address receiver)
        external
        override
        nonReentrant
        returns (uint256 inRedeems)
    {
        address strikeToken = parameters.strikeToken;
        address _redeemToken = redeemToken;
        uint256 strikeBalance = IERC20(strikeToken).balanceOf(address(this));
        uint256 redeemBalance = IERC20(_redeemToken).balanceOf(address(this));

        // Difference between redeemTokens balance and cache.
        inRedeems = redeemBalance;
        require(inRedeems > 0, "ERR_ZERO");
        require(strikeBalance >= inRedeems, "ERR_BAL_STRIKE");

        // Burn redeemTokens in the contract. Send strikeTokens to msg.sender.
        IRedeem(_redeemToken).burn(address(this), inRedeems);
        IERC20(strikeToken).safeTransfer(receiver, inRedeems);

        // Current balances.
        strikeBalance = IERC20(strikeToken).balanceOf(address(this));
        redeemBalance = IERC20(_redeemToken).balanceOf(address(this));

        // Update the cached balances.
        _fund(underlyingCache, strikeBalance);
        emit Redeem(receiver, inRedeems);
    }

    /**
     * @dev Burn optionTokens and redeemTokens to withdraw underlyingTokens.
     * @notice inRedeems / strike ratio = outUnderlyings && inOptions >= outUnderlyings.
     * @param receiver The outUnderlyings are sent to the receiver address.
     */
    function close(address receiver)
        external
        override
        nonReentrant
        returns (
            uint256 inRedeems,
            uint256 inOptions,
            uint256 outUnderlyings
        )
    {
        // Stores addresses and balances locally for gas savings.
        address underlyingToken = parameters.underlyingToken;
        address _redeemToken = redeemToken;
        uint256 underlyingBalance = IERC20(underlyingToken).balanceOf(
            address(this)
        );
        uint256 redeemBalance = IERC20(_redeemToken).balanceOf(address(this));
        uint256 optionBalance = balanceOf(address(this));

        // Differences between current and cached balances.
        inRedeems = redeemBalance;

        // The quantity of underlyingToken to send out it still determined by the quantity of inRedeems.
        // inRedeems is in units of strikeTokens, which is converted to underlyingTokens
        // by multiplying inRedeems by the strike ratio, which is base / quote.
        // This outUnderlyings quantity is checked against inOptions.
        // inOptions must be greater than or equal to outUnderlyings (1 option burned per 1 underlying purchased).
        // optionBalance must be greater than or equal to outUnderlyings.
        // Neither inRedeems or inOptions can be zero.
        outUnderlyings = inRedeems.mul(parameters.base).div(parameters.quote);

        // Assumes the cached balance is 0 so inOptions = balance of optionToken.
        // If optionToken is expired, optionToken does not need to be sent in. Only redeemToken.
        // solhint-disable-next-line not-rely-on-time
        inOptions = parameters.expiry > block.timestamp
            ? optionBalance
            : outUnderlyings;
        require(inRedeems > 0 && inOptions > 0, "ERR_ZERO");
        require(
            inOptions >= outUnderlyings && underlyingBalance >= outUnderlyings,
            "ERR_BAL_UNDERLYING"
        );

        // Burn optionTokens. optionTokens are only sent into contract when not expired.
        // solhint-disable-next-line not-rely-on-time
        if (parameters.expiry > block.timestamp) {
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
        redeemBalance = IERC20(_redeemToken).balanceOf(address(this));

        // Update the cached balances.
        _fund(underlyingBalance, strikeCache);
        emit Close(receiver, outUnderlyings);
    }

    /* === VIEW === */
    function caches()
        public
        override
        view
        returns (uint256 _underlyingCache, uint256 _strikeCache)
    {
        _underlyingCache = underlyingCache;
        _strikeCache = strikeCache;
    }

    function tokens()
        public
        override
        view
        returns (
            address _underlyingToken,
            address _strikeToken,
            address _redeemToken
        )
    {
        _underlyingToken = parameters.underlyingToken;
        _strikeToken = parameters.strikeToken;
        _redeemToken = redeemToken;
    }

    function strikeToken() public override view returns (address) {
        return parameters.strikeToken;
    }

    function underlyingToken() public override view returns (address) {
        return parameters.underlyingToken;
    }

    function base() public override view returns (uint256) {
        return parameters.base;
    }

    function quote() public override view returns (uint256) {
        return parameters.quote;
    }

    function expiry() public override view returns (uint256) {
        return parameters.expiry;
    }

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
        Primitives.Option memory _parameters = parameters;
        _underlyingToken = _parameters.underlyingToken;
        _strikeToken = _parameters.strikeToken;
        _redeemToken = redeemToken;
        _base = _parameters.base;
        _quote = _parameters.quote;
        _expiry = _parameters.expiry;
    }
}
