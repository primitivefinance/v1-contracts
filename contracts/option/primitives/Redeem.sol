pragma solidity ^0.6.2;

/**
 * @title   Strike Redeem ERC-20 for  Vanilla Options
 * @author  Primitive
 */

import "../interfaces/IRedeem.sol";
import "../interfaces/IPrimitiveFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Redeem is IRedeem, ERC20 {
    using SafeMath for uint;

    address public override factory;
    address public override tokenP;
    address public override underlying;

    constructor (address _factory, address _tokenP, address _underlying)
        public 
        ERC20("Primitive Strike Redeem", "REDEEM")
    {
        factory = _factory;
        tokenP = _tokenP;
        underlying = _underlying;
    }

    function mint(address to, uint amount) external override {
        require(msg.sender == tokenP, "ERR_NOT_VALID");
        _mint(to, amount);
    }

    function burn(address to, uint amount) external override {
        require(msg.sender == tokenP, "ERR_NOT_VALID");
        _burn(to, amount);
    }
}