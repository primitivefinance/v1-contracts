// SPDX-License-Identifier: MIT











pragma solidity ^0.6.2;

/**
 * @title Factory for deploying option series.
 * @author Primitive
 */

import { Option, SafeMath } from "../../primitives/Option.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OptionTemplateLib } from "../../libraries/OptionTemplateLib.sol";
import { NullCloneConstructor } from "../NullCloneConstructor.sol";
import { CloneLib } from "../../libraries/CloneLib.sol";

contract OptionFactory is Ownable, NullCloneConstructor {
    using SafeMath for uint256;

    address public optionTemplate;

    constructor(address registry) public {
        transferOwnership(registry);
    }

    function deployOptionTemplate() public {
        optionTemplate = OptionTemplateLib.deployTemplate();
    }

    function deploy(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external onlyOwner returns (address option) {
        require(optionTemplate != address(0x0), "ERR_NO_DEPLOYED_TEMPLATE");
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
        option = CloneLib.create2Clone(optionTemplate, uint256(salt));
        Option(option).initialize(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
    }

    function kill(address option) external onlyOwner {
        Option(option).kill();
    }

    function initialize(address option, address redeem) external onlyOwner {
        Option(option).initRedeemToken(redeem);
    }
}
