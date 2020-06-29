pragma solidity ^0.6.2;

/**
 * @title Protocol Factory Contract for Options
 * @author Primitive
 */

import "../../primitives/PrimeOption.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Factory is Ownable {
    using SafeMath for uint;

    constructor(address registry) public { transferOwnership(registry); }

    function deploy(address tokenU, address tokenS, uint base, uint quote, uint expiry)
        external
        onlyOwner
        returns (address prime)
    { prime = address(new PrimeOption(tokenU, tokenS, base, quote, expiry)); }

    function kill(address prime) external onlyOwner { PrimeOption(prime).kill(); }

    function initialize(address prime, address redeem) external onlyOwner {
        PrimeOption(prime).initTokenR(redeem);
    }
}