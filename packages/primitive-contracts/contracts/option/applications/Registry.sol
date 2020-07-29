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
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

contract Registry is IRegistry, Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    address public optionFactory;
    address public redeemFactory;
    address[] public activeOptions;

    mapping(address => bool) public isSupported;
    mapping(bytes32 => address) public options;

    event Deploy(
        address indexed from,
        address indexed option,
        bytes32 indexed id
    );

    constructor() public {
        transferOwnership(msg.sender);
    }

    function initialize(address _optionFactory, address _redeemFactory)
        external
        override
        onlyOwner
    {
        optionFactory = _optionFactory;
        redeemFactory = _redeemFactory;
    }

    function addSupported(address token) external override onlyOwner {
        isSupported[token] = true;
    }

    function deployOption(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external override nonReentrant whenNotPaused returns (address option) {
        // Checks
        require(
            underlyingToken != strikeToken &&
                isSupported[underlyingToken] &&
                isSupported[strikeToken],
            "ERR_ADDRESS"
        );
        bytes32 id = getId(underlyingToken, strikeToken, base, quote, expiry);
        require(options[id] == address(0), "ERR_OPTION_DEPLOYED");

        // Deploy option and redeem.
        option = IOptionFactory(optionFactory).deploy(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        options[id] = option;
        activeOptions.push(option);
        address redeem = IRedeemFactory(redeemFactory).deploy(
            option,
            strikeToken
        );

        IOptionFactory(optionFactory).initialize(option, redeem);
        emit Deploy(msg.sender, option, id);
    }

    function kill(address option) external override onlyOwner {
        IOptionFactory(optionFactory).kill(option);
    }

    function optionsLength() public override view returns (uint256 len) {
        len = activeOptions.length;
    }

    function getId(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) public pure returns (bytes32 id) {
        id = keccak256(
            abi.encodePacked(underlyingToken, strikeToken, base, quote, expiry)
        );
    }

    function getOption(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) public view returns (address option) {
        option = options[getId(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        )];
    }
}
