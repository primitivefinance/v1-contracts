// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

/**
 * @title Factory for deploying option contracts.
 * @author Primitive
 */

import { Option, SafeMath } from "../../primitives/Option.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OptionTemplateLib } from "../../libraries/OptionTemplateLib.sol";
import { NullCloneConstructor } from "../NullCloneConstructor.sol";
import { CloneLib } from "../../libraries/CloneLib.sol";
import { IOptionFactory } from "../../interfaces/IOptionFactory.sol";

contract OptionFactory is IOptionFactory, Ownable, NullCloneConstructor {
    using SafeMath for uint256;

    address public override optionTemplate;

    constructor(address registry) public {
        transferOwnership(registry);
    }

    /**
     * @dev Deploys the bytecode for the Option contract.
     */
    function deployOptionTemplate() public override {
        optionTemplate = OptionTemplateLib.deployTemplate();
    }

    /**
     * @dev Deploys a create2 clone of the option template contract.
     * @param underlyingToken The address of the underlying ERC-20 token.
     * @param strikeToken The address of the strike ERC-20 token.
     * @param base The quantity of underlying tokens per unit of quote amount of strike tokens.
     * @param quote The quantity of strike tokens per unit of base amount of underlying tokens.
     * @param expiry The unix timestamp for option expiry.
     */
    function deployClone(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external override onlyOwner returns (address) {
        require(optionTemplate != address(0x0), "ERR_NO_DEPLOYED_TEMPLATE");

        // Calculates the salt for create2.
        bytes32 salt = keccak256(
            abi.encodePacked(
                OptionTemplateLib.OPTION_SALT(),
                underlyingToken,
                strikeToken,
                base,
                quote,
                expiry
            )
        );

        // Deploys the clone using the template contract and calculated salt.
        address optionAddress = CloneLib.create2Clone(
            optionTemplate,
            uint256(salt)
        );

        // Sets the initial state of the option with the parameter arguments.
        Option(optionAddress).initialize(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );

        return optionAddress;
    }

    /**
     * @dev Only the factory can call the initRedeemToken function to set the redeem token address.
     * This function is only callable by the Registry contract (the owner).
     */
    function initRedeemToken(address optionAddress, address redeemAddress)
        external
        override
        onlyOwner
    {
        Option(optionAddress).initRedeemToken(redeemAddress);
    }

    /**
     * @dev Calculates the option token's address using the five option parameters.
     * @return The address of the option with the parameter arguments.
     */
    function calculateOptionAddress(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external override view returns (address) {
        // Calculates the salt using the parameter arguments and the salt used in the template contract
        // create2 deployment.
        bytes32 salt = keccak256(
            abi.encodePacked(
                OptionTemplateLib.OPTION_SALT(),
                underlyingToken,
                strikeToken,
                base,
                quote,
                expiry
            )
        );
        address optionAddress = CloneLib.deriveInstanceAddress(
            optionTemplate,
            salt
        );
        return optionAddress;
    }
}
