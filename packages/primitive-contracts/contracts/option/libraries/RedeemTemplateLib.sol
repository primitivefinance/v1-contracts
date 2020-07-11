// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";
import { Redeem } from "../primitives/Redeem.sol";

library RedeemTemplateLib {
    // solhint-disable-next-line max-line-length
    bytes32
        private constant _REDEEM_SALT = 0xe7383acf78b06b8f24cfa7359d041702736fa6a58e63dd38afea80889c4636e2; // keccak("primitive-redeem")

    // solhint-disable-next-line func-name-mixedcase
    function REDEEM_SALT() internal pure returns (bytes32) {
        return _REDEEM_SALT;
    }

    /**
     * @dev Deploys a clone of the deployed Redeem.sol contract.
     */
    function deployTemplate() external returns (address implementationAddress) {
        bytes memory creationCode = type(Redeem).creationCode;
        implementationAddress = Create2.deploy(0, _REDEEM_SALT, creationCode);
    }
}
