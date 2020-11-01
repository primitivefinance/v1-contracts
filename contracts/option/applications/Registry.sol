// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

/**
 * @title Protocol Registry Contract for Deployed Options.
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

    mapping(address => bool) private verifiedTokens;
    mapping(uint256 => bool) private verifiedExpiries;
    address[] public allOptionClones;

    event UpdatedOptionFactory(address indexed optionFactory_);
    event UpdatedRedeemFactory(address indexed redeemFactory_);
    event VerifiedToken(address indexed token);
    event VerifiedExpiry(uint256 expiry);
    event UnverifiedToken(address indexed token);
    event UnverifiedExpiry(uint256 expiry);
    event DeployedOptionClone(
        address indexed from,
        address indexed optionAddress,
        address indexed redeemAddress
    );

    constructor() public {
        transferOwnership(msg.sender);
    }

    /**
     * @dev Pauses the deployOption function.
     */
    function pauseDeployments() external override onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the deployOption function.
     */
    function unpauseDeployments() external override onlyOwner {
        _unpause();
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
     * @dev Sets an ERC-20 token verification status to true.
     * @notice A "verified" token is a standard ERC-20 token that we have tested with the option contract.
     *         An example of an "unverified" token is a non-standard ERC-20 token which has not been tested.
     */
    function verifyToken(address tokenAddress) external override onlyOwner {
        require(tokenAddress != address(0x0), "ERR_ZERO_ADDRESS");
        verifiedTokens[tokenAddress] = true;
        emit VerifiedToken(tokenAddress);
    }

    /**
     * @dev Sets a verified token's verification status to false.
     */
    function unverifyToken(address tokenAddress) external override onlyOwner {
        verifiedTokens[tokenAddress] = false;
        emit UnverifiedToken(tokenAddress);
    }

    /**
     * @dev Sets an expiry timestamp's verification status to true.
     * @notice A mapping of standardized, "verified", timestamps for the options.
     */
    function verifyExpiry(uint256 expiry) external override onlyOwner {
        require(expiry >= now, "ERR_EXPIRED_TIMESTAMP");
        verifiedExpiries[expiry] = true;
        emit VerifiedExpiry(expiry);
    }

    /**
     * @dev Sets an expiry timestamp's verification status to false.
     * @notice A mapping of standardized, "verified", timestamps for the options.
     */
    function unverifyExpiry(uint256 expiry) external override onlyOwner {
        verifiedExpiries[expiry] = false;
        emit UnverifiedExpiry(expiry);
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
        // Validation checks for option parameters.
        require(base > 0, "ERR_BASE_ZERO");
        require(quote > 0, "ERR_QUOTE_ZERO");
        require(expiry >= now, "ERR_EXPIRY");
        require(underlyingToken != strikeToken, "ERR_SAME_ASSETS");
        require(
            underlyingToken != address(0x0) && strikeToken != address(0x0),
            "ERR_ZERO_ADDRESS"
        );

        // Deploy option and redeem contract clones.
        address optionAddress = IOptionFactory(optionFactory).deployClone(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        address redeemAddress = IRedeemFactory(redeemFactory).deployClone(
            optionAddress
        );

        // Add the clone to the allOptionClones address array.
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
    function calculateOptionAddress(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) public override view returns (address) {
        address optionAddress = IOptionFactory(optionFactory)
            .calculateOptionAddress(
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
        bool verifiedUnderlying = isVerifiedToken(underlyingToken);
        bool verifiedStrike = isVerifiedToken(strikeToken);
        bool verifiedExpiry = isVerifiedExpiry(expiry);
        return verifiedUnderlying && verifiedStrike && verifiedExpiry;
    }

    /**
     * @dev Returns the length of the allOptionClones address array.
     */
    function getAllOptionClonesLength() public view returns (uint256) {
        return allOptionClones.length;
    }

    /**
     * @dev Checks the verifiedTokens private mapping and returns verification status of token.
     * @return bool Verified or not verified.
     */
    function isVerifiedToken(address tokenAddress) public view returns (bool) {
        return verifiedTokens[tokenAddress];
    }

    /**
     * @dev Checks the verifiedExpiries private mapping and returns verification status of token.
     * @return bool Verified or not verified.
     */
    function isVerifiedExpiry(uint256 expiry) public view returns (bool) {
        return verifiedExpiries[expiry];
    }

    /**
     * @dev Gets the option address and returns address zero if not yet deployed.
     * @notice Will calculate the option address using the parameter arguments.
     *         Checks the code size of the address to see if the contract has been deployed yet.
     *         If contract has not been deployed, returns address zero.
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
        address optionAddress = calculateOptionAddress(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        uint32 size = checkCodeSize(optionAddress);
        if (size > 0) {
            return optionAddress;
        } else {
            return address(0x0);
        }
    }

    /**
     * @dev Checks the code size of a target address and returns the uint32 size.
     * @param target The address to check code size.
     */
    function checkCodeSize(address target) private view returns (uint32) {
        uint32 size;
        assembly {
            size := extcodesize(target)
        }
        return size;
    }
}
