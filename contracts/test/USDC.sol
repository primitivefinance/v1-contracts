pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract USDC is ERC20, ERC20Detailed {
    constructor(uint256 initialSupply) ERC20Detailed("Testnet USDC", "USDC", 18) public {
        _mint(msg.sender, initialSupply);
    }

    /**
    * @dev Function to mint tokens
    * @param to The address that will receive the minted tokens.
    * @param value The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(address to, uint256 value) public returns (bool) {
        _mint(to, value);
        return true;
    }
}