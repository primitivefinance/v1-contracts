pragma solidity ^0.6.0;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {Option} from "../../primitives/Option.sol";

library OptionImplementationLauncherLib {
    bytes32 constant _OPTION_SALT = 0x56f3a99c8e36689645460020839ea1340cbbb2e507b7effe3f180a89db85dd87; // keccak("primitive-option")

    function OPTION_SALT() internal pure returns (bytes32) {
        return _OPTION_SALT;
    }

    /**
     * @dev Deploys a clone of the deployed Option.sol contract.
     */
    function deployImplementation()
        external
        returns (address implementationAddress)
    {
        bytes memory creationCode = type(Option).creationCode;
        implementationAddress = Create2.deploy(0, _OPTION_SALT, creationCode);
    }
}
