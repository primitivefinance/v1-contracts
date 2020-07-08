// SPDX-License-Identifier: MIT





pragma solidity ^0.6.2;

/**
 * @title   Vanilla Option Pool Base
 * @author  Primitive
 */

import { IOption } from "../../option/interfaces/IOption.sol";
import { IPool } from "../interfaces/IPool.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Pool is IPool, Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    uint256 public constant MIN_LIQUIDITY = 10**4;

    address public override factory;
    address public override optionToken;

    event Deposit(
        address indexed from,
        uint256 inUnderlyings,
        uint256 outTokenPULP
    );
    event Withdraw(
        address indexed from,
        uint256 inLiquidityToken,
        uint256 outUnderlyings
    );

    constructor(address _optionToken, address _factory)
        public
        ERC20("Primitive V1 Pool", "PULP")
    {
        optionToken = _optionToken;
        factory = _factory;
    }

    function kill() public override onlyOwner returns (bool) {
        paused() ? _unpause() : _pause();
    }

    /**
     * @dev Private function to mint optionTokenULP to depositor.
     */
    function _addLiquidity(
        address to,
        uint256 inUnderlyings,
        uint256 poolBalance
    ) internal returns (uint256 outTokenPULP) {
        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance.
        uint256 _totalSupply = totalSupply();

        // If liquidity is not intiialized, mint the initial liquidity.
        if (_totalSupply == 0) {
            outTokenPULP = inUnderlyings;
        } else {
            outTokenPULP = inUnderlyings.mul(_totalSupply).div(poolBalance);
        }

        require(
            outTokenPULP > uint256(0) && outTokenPULP >= MIN_LIQUIDITY,
            "ERR_ZERO_LIQUIDITY"
        );
        _mint(to, outTokenPULP);
        emit Deposit(to, inUnderlyings, outTokenPULP);
    }

    function _removeLiquidity(
        address to,
        uint256 inLiquidityToken,
        uint256 poolBalance
    ) internal returns (uint256 outUnderlyings) {
        require(
            balanceOf(to) >= inLiquidityToken && inLiquidityToken > 0,
            "ERR_BAL_PULP"
        );
        uint256 _totalSupply = totalSupply();

        // Calculate output amounts.
        outUnderlyings = inLiquidityToken.mul(poolBalance).div(_totalSupply);
        require(outUnderlyings > uint256(0), "ERR_ZERO");
        // Burn optionTokenULP.
        _burn(to, inLiquidityToken);
        emit Withdraw(to, inLiquidityToken, outUnderlyings);
    }

    function _write(uint256 outUnderlyings)
        internal
        returns (uint256 outTokenP)
    {
        address _optionToken = optionToken;
        address underlyingToken = IOption(_optionToken).underlyingToken();
        require(
            IERC20(underlyingToken).balanceOf(address(this)) >= outUnderlyings,
            "ERR_BAL_UNDERLYING"
        );
        // Transfer underlying tokens to option contract.
        IERC20(underlyingToken).transfer(_optionToken, outUnderlyings);

        // Mint  and  Redeem to the receiver.
        (outTokenP, ) = IOption(_optionToken).mint(address(this));
    }

    function _exercise(
        address receiver,
        uint256 outStrikes,
        uint256 inOptions
    ) internal returns (uint256 outUnderlyings) {
        address _optionToken = optionToken;
        // Transfer strike token to option contract.
        IERC20(IOption(_optionToken).strikeToken()).transfer(
            _optionToken,
            outStrikes
        );

        // Transfer option token to option contract.
        IERC20(_optionToken).transferFrom(msg.sender, _optionToken, inOptions);

        // Call the exercise function to receive underlying tokens.
        (, outUnderlyings) = IOption(_optionToken).exercise(
            receiver,
            inOptions,
            new bytes(0)
        );
    }

    function _redeem(address receiver, uint256 outTokenR)
        internal
        returns (uint256 inTokenS)
    {
        address _optionToken = optionToken;
        // Push redeemToken to _optionToken so we can call redeem() and pull strikeToken.
        IERC20(IOption(_optionToken).redeemToken()).transfer(
            _optionToken,
            outTokenR
        );
        // Call redeem function to pull strikeToken.
        inTokenS = IOption(_optionToken).redeem(receiver);
    }

    function _close(uint256 outTokenR, uint256 inOptions)
        internal
        returns (uint256 outUnderlyings)
    {
        address _optionToken = optionToken;
        // Transfer redeem to the option contract.
        IERC20(IOption(_optionToken).redeemToken()).transfer(
            _optionToken,
            outTokenR
        );

        // Transfer option token to option contract.
        IERC20(_optionToken).transferFrom(msg.sender, _optionToken, inOptions);

        // Call the close function to have the receive underlying tokens.
        (, , outUnderlyings) = IOption(_optionToken).close(address(this));
    }

    function balances()
        public
        override
        view
        returns (uint256 balanceU, uint256 balanceR)
    {
        (address underlyingToken, , address redeemToken) = IOption(optionToken)
            .tokens();
        balanceU = IERC20(underlyingToken).balanceOf(address(this));
        balanceR = IERC20(redeemToken).balanceOf(address(this));
    }
}
