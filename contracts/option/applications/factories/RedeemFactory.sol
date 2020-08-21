// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

/**
 * @title Protocol Factory Contract for Redeems
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

    function deployRedeemTemplate() public override {
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
