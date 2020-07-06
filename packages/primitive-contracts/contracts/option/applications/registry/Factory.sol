pragma solidity ^0.6.2;

/**
 * @title Protocol Factory Contract for Options
 * @author Primitive
 */

import {Option} from "../../primitives/Option.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FactoryLib} from "./FactoryLib.sol";
import {NullCloneConstructor} from "./NullCloneConstructor.sol";
import {
    OptionImplementationLauncherLib
} from "./OptionImplementationLauncherLib.sol";

contract Factory is Ownable, NullCloneConstructor {
    using SafeMath for uint256;

    address public optionImplementationAddress;

    constructor(address registry) public {
        transferOwnership(registry);
    }

    function deployOptionImplementation() public {
        optionImplementationAddress = OptionImplementationLauncherLib
            .deployImplementation();
    }

    function deploy(
        address tokenU,
        address tokenS,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external onlyOwner returns (address option) {
        require(
            optionImplementationAddress != address(0x0),
            "ERR_NO_IMPLEMENTATION"
        );
        bytes32 salt = keccak256(
            abi.encodePacked(
                OptionImplementationLauncherLib.OPTION_SALT(),
                tokenU,
                tokenS,
                base,
                quote,
                expiry
            )
        );
        option = FactoryLib.create2Clone(
            optionImplementationAddress,
            uint256(salt)
        );
        Option(option).initialize(tokenU, tokenS, base, quote, expiry);
    }

    function kill(address option) external onlyOwner {
        Option(option).kill();
    }

    function initialize(address option, address redeem) external onlyOwner {
        Option(option).initTokenR(redeem);
    }
}
