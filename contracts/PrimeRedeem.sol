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
    string private constant NAME = "Primitive Strike Redeem";
    string private constant SYMBOL = "REDEEM";
    address public override factory;
    address public override tokenS;
    address public override tokenP;

    constructor (address _tokenP, address _tokenS) public ERC20(NAME, SYMBOL) {
        factory = msg.sender;
        tokenS = _tokenS;
        tokenP = _tokenP;
    }

    function mint(address to, uint amount) external override {
        require(msg.sender == tokenP, "ERR_NOT_VALID");
        address feeReceiver = IPrimitiveFactory(factory).feeReceiver();
        bool takeFee = feeReceiver != address(0);
        if(!takeFee) {
            _mint(to, amount);
        } else return mintWithFee(to, amount);
    }

    function burn(address to, uint amount) external override {
        require(msg.sender == tokenP, "ERR_NOT_VALID");
        _burn(to, amount);
    }

    function mintWithFee(address to, uint amount) private {
        uint _fee = amount.div(FEE);
        _mint(to, amount.sub(_fee));
        _mint(feeReceiver, _fee);
    }
}