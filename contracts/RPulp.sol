pragma solidity ^0.6.2;

/**
 * @title Primitive's ERC-20 Option
 * @author Primitive
 */

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import './Instruments.sol';


contract RPulp is ERC20Detailed("Primitive Underlying LP", "rPULP", 18), ERC20 {
    using SafeMath for uint256;

    address public _controller;
    mapping(address => bool) public _valid;


    constructor () public {
        _controller = msg.sender;
    }

    receive() external payable {}

    function setValid(address valid) public returns(bool) {
        require(msg.sender == _controller, 'ERR_NOT_OWNER');
        _valid[valid] = true;
        return true;
    }


    function mint(address user, uint256 amount) external returns(bool)  {
        require(_valid[msg.sender], 'ERR_NOT_VALID');
        _mint(user, amount);
        return true;
    }

    function burn(address user, uint256 amount) external returns(bool)  {
        require(_valid[msg.sender], 'ERR_NOT_VALID');
        _burn(user, amount);
        return true;
    }

    /**
     @dev function to send ether with the most security
     */
    function sendEther(address payable user, uint256 amount) internal returns (bool) {
        (bool success, ) = user.call.value(amount)("");
        require(success, "Send ether fail");
        return success;
    }

    function append(string memory a, string memory b, string memory c, string memory d, string memory e) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b, c, d, e));
    }

}