// SPDX-License-Identifier: MIT
pragma solidity 0.6.2;

/**
 * @title   Redeem Token
 * @notice  A token that is redeemable for it's paird option token's assets.
 * @author  Primitive
 */

import { IRedeem } from "../interfaces/IRedeem.sol";
import { ERC20 } from "./ERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

contract Redeem is IRedeem, ERC20 {
    using SafeMath for uint256;

    address public override factory;
    address public override optionToken;

    string public constant name = "Primitive V1 Redeem";
    string public constant symbol = "RDM";
    uint8 public constant decimals = 18;

    // solhint-disable-next-line no-empty-blocks
    constructor() public {}

    /**
     * @dev Sets the initial state for the redeem token. Called only once and immediately after deployment.
     * @param factory_ The address of the factory contract which handles the deployment.
     * @param optionToken_ The address of the option token which this redeem token will be paired with.
     */
    function initialize(address factory_, address optionToken_)
        public
        override
    {
        require(factory == address(0x0), "ERR_IS_INITIALIZED");
        factory = factory_;
        optionToken = optionToken_;
    }

    /**
     * @dev Mints redeem tokens. Only callable by the paired option contract.
     * @param to The address to mint redeem tokens to.
     * @param amount The quantity of redeem tokens to mint.
     */
    function mint(address to, uint256 amount) external override {
        require(msg.sender == optionToken, "ERR_NOT_VALID");
        _mint(to, amount);
    }

    /**
     * @dev Burns redeem tokens. Only callable by the paired option contract.
     * @param to The address to burn redeem tokens from.
     * @param amount The quantity of redeem tokens to burn.
     */
    function burn(address to, uint256 amount) external override {
        require(msg.sender == optionToken, "ERR_NOT_VALID");
        _burn(to, amount);
    }
}
