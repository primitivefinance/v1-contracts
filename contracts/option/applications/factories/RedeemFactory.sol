// SPDX-License-Identifier: MIT

<<<<<<< HEAD:contracts/option/applications/factories/RedeemFactory.sol
<<<<<<< HEAD
<<<<<<< HEAD




=======
>>>>>>> 7e9e00418e7ccb1da05482f268175836af98474d
=======
>>>>>>> release/v0.3.0
=======
>>>>>>> develop/develop:packages/primitive-contracts/contracts/option/applications/factories/RedeemFactory.sol
pragma solidity ^0.6.2;

/**
 * @title Protocol Factory Contract for Redeems
 * @author Primitive
 */

import { Redeem, SafeMath } from "../../primitives/Redeem.sol";
import { RedeemTemplateLib } from "../../libraries/RedeemTemplateLib.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { CloneLib } from "../../libraries/CloneLib.sol";
import { NullCloneConstructor } from "../NullCloneConstructor.sol";

contract RedeemFactory is IRedeemFactory, Ownable, NullCloneConstructor {
    using SafeMath for uint256;

    address public override redeemTemplate;

    constructor(address registry) public {
        transferOwnership(registry);
    }

    function deployRedeemTemplate() public {
        redeemTemplate = RedeemTemplateLib.deployTemplate();
    }

    function deploy(address optionToken, address redeemableToken)
        external
        override
        onlyOwner
        returns (address redeem)
    {
        bytes32 salt = keccak256(
            abi.encodePacked(
                RedeemTemplateLib.REDEEM_SALT(),
                owner(),
                optionToken,
                redeemableToken
            )
        );
        redeem = CloneLib.create2Clone(redeemTemplate, uint256(salt));
        Redeem(redeem).initialize(owner(), optionToken, redeemableToken);
    }
}
