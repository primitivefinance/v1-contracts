pragma solidity ^0.6.2;

/**
 * @title   Primitive's Redeem ERC-20 for Prime Options
 * @author  Primitive
 */

import "./interfaces/IPrimeRedeem.sol";
import "./interfaces/IPrimitiveFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract PrimeRedeem is IPrimeRedeem, ERC20 {
    using SafeMath for uint;

    string public constant NAME = "Primitive Strike Redeem";
    string public constant SYMBOL = "REDEEM";

    uint public fee;
    address public override factory;
    address public override tokenS;
    address public override tokenP;


    constructor (
        address _tokenP,
        address _tokenS
    )
        public
        ERC20(NAME, SYMBOL)
    {
        factory = msg.sender;
        tokenS = _tokenS;
        tokenP = _tokenP;
    }

    function mint(address to, uint amount) external override returns(bool)  {
        require(msg.sender == tokenP, "ERR_NOT_VALID");
        address feeReceiver = IPrimitiveFactory(factory).feeReceiver();
        uint _fee = amount.div(fee);
        _mint(to, amount.sub(_fee));
        _mint(feeReceiver, _fee);
        return true;
    }

    function burn(address to, uint amount) external override returns(bool)  {
        require(msg.sender == tokenP, "ERR_NOT_VALID");
        _burn(to, amount);
        return true;
    }
}