// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

/**
 * @title Protocol Registry Contract for Deployed Options
 * @author Primitive
 */

import { IOption } from "../interfaces/IOption.sol";
import { IRegistry } from "../interfaces/IRegistry.sol";
import { IOptionFactory } from "../interfaces/IOptionFactory.sol";
import { IRedeemFactory } from "../interfaces/IRedeemFactory.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

contract Registry is IRegistry, Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint;

    address public override optionFactory;
    address public override redeemFactory;

    mapping(address => bool) public isSupported;

    event Deploy(address indexed from, address indexed option, address indexed redeem);

    constructor() public {
        transferOwnership(msg.sender);
    }

    function initialize(address _optionFactory, address _redeemFactory) external override onlyOwner {
        optionFactory = _optionFactory;
        redeemFactory = _redeemFactory;
    }

    function addSupported(address token) external override onlyOwner {
        isSupported[token] = true;
    }

    function deployOption(
        address underlyingToken,
        address strikeToken,
        uint base,
        uint quote,
        uint expiry
    ) external override nonReentrant whenNotPaused returns (address option) {
        // Checks
        require(underlyingToken != strikeToken && isSupported[underlyingToken] && isSupported[strikeToken], "ERR_ADDRESS");

        // Deploy option and redeem.
        option = IOptionFactory(optionFactory).deploy(underlyingToken, strikeToken, base, quote, expiry);
        address redeem = IRedeemFactory(redeemFactory).deploy(option, strikeToken);

        IOptionFactory(optionFactory).initialize(option, redeem);
        emit Deploy(msg.sender, option, redeem);
    }

    function kill(address option) external override onlyOwner {
        IOptionFactory(optionFactory).kill(option);
    }

    function getOption(
        address underlyingToken,
        address strikeToken,
        uint base,
        uint quote,
        uint expiry
    ) public view returns (address option) {
        option = IOptionFactory(optionFactory).getOption(underlyingToken, strikeToken, base, quote, expiry);
    }
}
