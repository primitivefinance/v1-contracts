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

    address public override optionFactory;
    address public override redeemFactory;

    mapping(address => bool) public verifiedTokens;
    mapping(uint256 => bool) public verifiedExpiries;
    address[] public allOptionClones;

    event UpdatedOptionFactory(address indexed optionFactory_);
    event UpdatedRedeemFactory(address indexed redeemFactory_);
    event DeployedOptionClone(
        address indexed from,
        address indexed optionAddress,
        address indexed redeemAddress
    );

    constructor() public {
        transferOwnership(msg.sender);
    }

    /**
     * @dev Sets the option factory contract to use for deploying clones.
     * @param optionFactory_ The address of the option factory.
     */
    function setOptionFactory(address optionFactory_)
        external
        override
        onlyOwner
    {
        optionFactory = optionFactory_;
        emit UpdatedOptionFactory(optionFactory_);
    }

    /**
     * @dev Sets the redeem factory contract to use for deploying clones.
     * @param redeemFactory_ The address of the redeem factory.
     */
    function setRedeemFactory(address redeemFactory_)
        external
        override
        onlyOwner
    {
        redeemFactory = redeemFactory_;
        emit UpdatedRedeemFactory(redeemFactory_);
    }

    /**
     * @dev A mapping of "verified" ERC-20 tokens.
     * @notice A "verified" token is a standard ERC-20 token that we have tested with the option contract.
     */
    function verifyToken(address tokenAddress) external override onlyOwner {
        verifiedTokens[tokenAddress] = true;
    }

    /**
     * @dev A mapping of standardized, "verified", timestamps for the options.
     * @notice The definition of a standardized time is loose and will evolve over time.
     */
    function verifyExpiry(uint256 expiry) external override onlyOwner {
        verifiedExpiries[expiry] = true;
    }

    /**
     * @dev Deploys an option contract clone with create2.
     * @param underlyingToken The address of the ERC-20 underlying token.
     * @param strikeToken The address of the ERC-20 strike token.
     * @param base The quantity of underlying tokens per unit of quote amount of strike tokens.
     * @param quote The quantity of strike tokens per unit of base amount of underlying tokens.
     * @param expiry The unix timestamp of the option's expiration date.
     * @return The address of the deployed option clone.
     */
    function deployOption(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external override nonReentrant whenNotPaused returns (address) {
        // Checks to make sure tokens are not the same.
        require(underlyingToken != strikeToken, "ERR_ADDRESS");

        // Deploy option and redeem contract clones.
        address optionAddress = IOptionFactory(optionFactory).deploy(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        address redeemAddress = IRedeemFactory(redeemFactory).deploy(
            optionAddress,
            strikeToken
        );

        // Add the clone to the address array
        allOptionClones.push(optionAddress);

        // Initialize the new option contract's paired redeem token.
        IOptionFactory(optionFactory).initRedeemToken(
            optionAddress,
            redeemAddress
        );
        emit DeployedOptionClone(msg.sender, optionAddress, redeemAddress);
        return optionAddress;
    }

    /**
     * @dev Calculates the option address deployed with create2 using the parameter arguments.
     * @param underlyingToken The address of the ERC-20 underlying token.
     * @param strikeToken The address of the ERC-20 strike token.
     * @param base The quantity of underlying tokens per unit of quote amount of strike tokens.
     * @param quote The quantity of strike tokens per unit of base amount of underlying tokens.
     * @param expiry The unix timestamp of the option's expiration date.
     * @return The address of the option with the parameter arguments.
     */
    function getOptionAddress(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) public override view returns (address) {
        address optionAddress = IOptionFactory(optionFactory).getOptionAddress(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        return optionAddress;
    }

    /**
     * @dev Checks an option address to see if it has verified assets and expiry time.
     * @param optionAddress The address of the option token.
     * @return bool If the option has verified underlying and strike tokens, and expiry time.
     */
    function isVerifiedOption(address optionAddress)
        external
        override
        view
        returns (bool)
    {
        IOption option = IOption(optionAddress);
        address underlyingToken = option.getUnderlyingTokenAddress();
        address strikeToken = option.getStrikeTokenAddress();
        uint256 expiry = option.getExpiryTime();
        bool verifiedUnderlying = verifiedTokens[underlyingToken];
        bool verifiedStrike = verifiedTokens[strikeToken];
        bool verifiedExpiry = verifiedExpiries[expiry];
        return verifiedUnderlying && verifiedStrike && verifiedExpiry;
    }

    /**
     * @dev Returns the length of the allOptionClones address array.
     */
    function getAllOptionClonesLength() public view returns (uint256) {
        return allOptionClones.length;
    }
}
