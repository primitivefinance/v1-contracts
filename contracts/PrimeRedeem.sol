pragma solidity ^0.6.2;

/**
 * @title Primitive's Strike Redeem ERC-20 for Prime Options
 * @author Primitive
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./controller/Instruments.sol";


contract PrimeRedeem is ERC20 {
    using SafeMath for uint256;

    address public _controller;
    mapping(address => bool) public _valid;
    bool public _isCallPulp;

    address public strike;
    address payable public option;


    constructor (
        string memory name,
        string memory symbol,
        address payable optionAddress,
        address strikeAddress
    )
        public
        ERC20(name, symbol)
    {
        _controller = msg.sender;
        strike = strikeAddress;
        option = optionAddress;
        _valid[option] = true;
    }

    function mint(address user, uint256 amount) external returns(bool)  {
        require(msg.sender == option, "ERR_NOT_VALID");
        _mint(user, amount);
        return true;
    }

    function burn(address user, uint256 amount) external returns(bool)  {
        require(msg.sender == option, "ERR_NOT_VALID");
        _burn(user, amount);
        return true;
    }
}