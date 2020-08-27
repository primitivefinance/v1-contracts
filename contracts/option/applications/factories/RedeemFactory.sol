// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

/**
 * @title Protocol Factory Contract for Redeem Tokens.
 * @notice Uses cloning technology on a deployed template contract.
 * @author Primitive
 */

import { Redeem, SafeMath } from "../../primitives/Redeem.sol";
import { RedeemTemplateLib } from "../../libraries/RedeemTemplateLib.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { CloneLib } from "../../libraries/CloneLib.sol";
import { NullCloneConstructor } from "../NullCloneConstructor.sol";
import { IRedeemFactory } from "../../interfaces/IRedeemFactory.sol";

contract RedeemFactory is IRedeemFactory, Ownable, NullCloneConstructor {
    using SafeMath for uint256;

    address public override redeemTemplate;

    constructor(address registry) public {
        transferOwnership(registry);
    }

    /**
     * @dev Deploys the full bytecode of the Redeem contract to be used as a template for clones.
     */
    function deployRedeemTemplate() public override {
        redeemTemplate = RedeemTemplateLib.deployTemplate();
    }

    /**
     * @dev Deploys a cloned instance of the template Redeem contract.
     * @param optionToken The address of the option token which this redeem clone will be paired with.
     * @return redeemAddress The address of the deployed Redeem token clone.
     */
    function deployClone(address optionToken)
        external
        override
        onlyOwner
        returns (address)
    {
        bytes32 salt = keccak256(
            abi.encodePacked(
                RedeemTemplateLib.REDEEM_SALT(),
                owner(),
                optionToken
            )
        );
        address redeemAddress = CloneLib.create2Clone(
            redeemTemplate,
            uint256(salt)
        );
        Redeem(redeemAddress).initialize(owner(), optionToken);
        return redeemAddress;
    }
}
