pragma solidity ^0.6.2;

/**
 * @title   Strike Redeem ERC-20 for Prime Vanilla Options
 * @author  Primitive
 */

import "./interfaces/IPrimeRedeem.sol";
import "./interfaces/IPrimitiveFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract PrimeRedeem is IPrimeRedeem, ERC20 {
    using SafeMath for uint;

    uint public constant FEE = 500;
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
        address feeReceiver = IPrimitiveFactory(factory).feeReceiver();
        bool takeFee = feeReceiver != address(0);
        if(!takeFee) {
            _mint(to, amount);
        } else {
            uint _fee = amount.div(FEE);
            _mint(to, amount.sub(_fee));
            _mint(feeReceiver, _fee);
        }
    }

    function burn(address to, uint amount) external override {
        require(msg.sender == tokenP, "ERR_NOT_VALID");
        _burn(to, amount);
    }
}