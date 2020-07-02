pragma solidity ^0.6.2;

/**
 * @title Protocol Factory Contract for Redeems
 * @author Primitive
 */

import "../../primitives/Redeem.sol";
import { NullCloneConstructor } from "@0confirmation/sol/contracts/NullCloneConstructor.sol";
import { FactoryLib } from "@0confirmation/sol/contracts/FactoryLib.sol";
import { RedeemImplementationLauncherLib } from "./RedeemImplementationLauncherLib.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FactoryRedeem is Ownable, NullCloneConstructor {
    using SafeMath for uint256;
    address public redeemImplementationAddress;

    constructor(address registry) public { transferOwnership(registry); }
    function deployRedeemImplementation() public {
      redeemImplementationAddress = RedeemImplementationLauncherLib.deployImplementation();
    }
    function deploy(address tokenP, address underlying) external onlyOwner returns (address redeem) {
        bytes32 salt = keccak256(abi.encodePacked(RedeemImplementationLauncherLib.REDEEM_SALT(), owner(), tokenP, underlying));
        redeem = FactoryLib.create2Clone(redeemImplementationAddress, uint256(salt));
        Redeem(redeem).initialize(owner(), tokenP, underlying);
    }
}
