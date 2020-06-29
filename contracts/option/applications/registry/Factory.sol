pragma solidity ^0.6.2;

/**
 * @title Protocol Factory Contract for Options
 * @author Primitive
 */

import "../../primitives/Option.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Factory is Ownable {
    using SafeMath for uint;

    constructor(address registry) public { transferOwnership(registry); }

    function deploy(address tokenU, address tokenS, uint base, uint quote, uint expiry)
        external
        onlyOwner
        returns (address option)
    { option = address(new Option(tokenU, tokenS, base, quote, expiry)); }

    function kill(address option) external onlyOwner { Option(option).kill(); }

    function initialize(address option, address redeem) external onlyOwner {
        Option(option).initTokenR(redeem);
    }
}