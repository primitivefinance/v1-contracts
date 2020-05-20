pragma solidity ^0.6.2;

/**
 * @title   Primitive's Redeem ERC-20 for Prime Options
 * @author  Primitive
 */

import "./interfaces/IPrimeRedeem.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract PrimeRedeem is IPrimeRedeem, ERC20 {
    using SafeMath for uint256;

    address public override controller;

    address public override tokenS;
    address public override tokenP;


    constructor (
        string memory name,
        string memory symbol,
        address _tokenP,
        address _tokenS
    )
        public
        ERC20(name, symbol)
    {
        controller = msg.sender;
        tokenS = _tokenS;
        tokenP = _tokenP;
    }

    function mint(address user, uint256 amount) external override returns(bool)  {
        require(msg.sender == tokenP, "ERR_NOT_VALID");
        _mint(user, amount);
        return true;
    }

    function burn(address user, uint256 amount) external override returns(bool)  {
        require(msg.sender == tokenP, "ERR_NOT_VALID");
        _burn(user, amount);
        return true;
    }
}