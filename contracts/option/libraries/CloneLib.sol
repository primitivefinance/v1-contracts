// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

/**
 * @title Create2 Clone Factory Library
 * @author Alan Lu, Gnosis.
 *         Raymond Pulver IV.
 */

import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";

library CloneLib {
    /**
     * @dev Calls internal creation computation function.
     */
    function computeCreationCode(address target)
        internal
        view
        returns (bytes memory clone)
    {
        clone = computeCreationCode(address(this), target);
    }

    /**
     * @dev Computes the Clone's creation code.
     */
    function computeCreationCode(address deployer, address target)
        internal
        pure
        returns (bytes memory clone)
    {
        bytes memory consData = abi.encodeWithSignature(
            "cloneConstructor(bytes)",
            new bytes(0)
        );
        clone = new bytes(99 + consData.length);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            mstore(
                add(clone, 0x20),
                0x3d3d606380380380913d393d73bebebebebebebebebebebebebebebebebebebe
            )
            mstore(
                add(clone, 0x2d),
                mul(deployer, 0x01000000000000000000000000)
            )
            mstore(
                add(clone, 0x41),
                0x5af4602a57600080fd5b602d8060366000396000f3363d3d373d3d3d363d73be
            )
            mstore(add(clone, 0x60), mul(target, 0x01000000000000000000000000))
            mstore(
                add(clone, 116),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
        }
        for (uint256 i = 0; i < consData.length; i++) {
            clone[i + 99] = consData[i];
        }
    }

    /**
     * @dev Calls Open Zeppelin's Create2.computeAddress() to get an address for the clone.
     */
    function deriveInstanceAddress(address target, bytes32 salt)
        internal
        view
        returns (address)
    {
        return
            Create2.computeAddress(
                salt,
                keccak256(computeCreationCode(target))
            );
    }

    /**
     * @dev Calls Open Zeppelin's Create2.computeAddress() to get an address for the clone.
     */
    function deriveInstanceAddress(
        address from,
        address target,
        bytes32 salt
    ) internal pure returns (address) {
        return
            Create2.computeAddress(
                salt,
                keccak256(computeCreationCode(from, target)),
                from
            );
    }

    /**
     * @dev Computs creation code, and then instantiates it with create2.
     */
    function create2Clone(address target, uint256 saltNonce)
        internal
        returns (address result)
    {
        bytes memory clone = computeCreationCode(target);
        bytes32 salt = bytes32(saltNonce);

        // solhint-disable-next-line no-inline-assembly
        assembly {
            let len := mload(clone)
            let data := add(clone, 0x20)
            result := create2(0, data, len, salt)
        }

        require(result != address(0), "ERR_CREATE2_FAIL");
    }
}
