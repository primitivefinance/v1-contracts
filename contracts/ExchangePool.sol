pragma solidity ^0.6.2;

/**
 * @title Primitive's Exchange Pool for ERC-20 Prime Options
 * @author Primitive
 */

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';

abstract contract IPrimeERC20 {
    function balanceOf(address user) public view virtual returns (uint);
    function transferFrom(address from, address to, uint256 amount) public virtual returns (bool);
    function transfer(address to, uint256 amount) public virtual returns (bool);
}

contract ExchangePool is ERC20Detailed('ePULP', 'Exchange Primitive LP Tokens', 18), ERC20 {
    using SafeMath for uint256;

    address public _controller;
    IPrimeERC20 public _prime;
    uint256 public _y;

    constructor (address prime) public {
        _controller = msg.sender;
        _prime = IPrimeERC20(prime);
    }

    function sell(uint256 options) public returns (bool) {
        require(_prime.balanceOf(msg.sender) >= options, 'ERR_BAL_OPTIONS');
        return true;
    }

    function addLiquidity(
        uint256 minQLiquidity,
        uint256 maxQTokens
    ) public payable returns(uint256) {
        uint256 totalSupply = totalSupply();
        if (totalSupply > 0) {
            uint256 rEth = address(this).balance.sub(msg.value);
            uint256 rToken = _prime.balanceOf(address(this));
            uint256 qToken = msg.value.mul(rToken).div(rEth).sub(1);
            uint256 newLiquidity = msg.value.mul(totalSupply).div(rEth);
            _mint(msg.sender, newLiquidity);
            _prime.transferFrom(msg.sender, address(this), qToken);
            return newLiquidity;
        } else {
            uint256 initialQLiquidity = address(this).balance;
            _mint(msg.sender, initialQLiquidity);
            _prime.transferFrom(msg.sender, address(this), maxQTokens);
            return initialQLiquidity;
        }
    }

    function removeLiquidity(
        uint256 qLiquidity,
        uint256 minQEth,
        uint256 minQTokens
    ) public returns (uint256, uint256) {
        require(qLiquidity > 0 &&  minQEth > 0 && minQTokens > 0, 'ERR_ZERO');

        uint256 totalSupply = totalSupply();
        uint256 rTokens = _prime.balanceOf(address(this));
        uint256 qEth = qLiquidity.mul(address(this).balance).div(totalSupply);
        uint256 qTokens = qLiquidity.mul(rTokens).div(totalSupply);
        require(qEth >= minQEth, 'ERR_BAL_ETH');
        require(qTokens >= minQTokens, 'ERR_BAL_TOKENS');
        _burn(msg.sender, qLiquidity);
        _prime.transfer(msg.sender, qTokens);
        sendEther(msg.sender, qEth);
        return (qLiquidity, qEth);
    }

    function swapTokensToEth(
        uint256 qTokens,
        uint256 minQEth
    ) public returns (bool) {
        require(_prime.balanceOf(msg.sender) >= qTokens, 'ERR_BAL_OPTIONS');
        uint256 rInput = _prime.balanceOf(address(this));
        uint256 ethOutput = getInputPrice(qTokens, rInput, address(this).balance);
        require(ethOutput >= minQEth, 'ERR_BAL_ETH');
        _prime.transferFrom(msg.sender, address(this), qTokens);
        return sendEther(msg.sender, ethOutput);
    }

    /**
     @dev function to send ether with the most security
     */
    function sendEther(address payable user, uint256 amount) internal returns (bool) {
        (bool success, ) = user.call.value(amount)("");
        require(success, "Send ether fail");
        return success;
    }

    /**
     * @dev gets the input price (amount of tokens bought)
     */
    function getInputPrice(
        uint256 qInput,
        uint256 rInput,
        uint256 rOutput
    ) public view returns (uint256) {
        uint256 k = qInput.mul(1000).mul(rOutput);
        uint256 x = rInput.mul(1000).add(qInput);
        uint256 y = k.div(x);
        return y;
    }

    function getOutputPrice(
        uint256 qOutput,
        uint256 rInput,
        uint256 rOutput
    ) public view returns (uint256) {
        uint256 k = qOutput.mul(1000).mul(rInput);
        uint256 y = (rOutput.sub(qOutput)).mul(1000);
        uint256 x = k.div(y).add(1);
        return x;
    }
}