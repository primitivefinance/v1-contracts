pragma solidity ^0.6.2;

/**
 * @title Primitive's Exchange Pool for ERC-20 Prime Options
 * @author Primitive
 */

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';
import './PrimeInterface.sol';

contract PrimeExchange is ERC20Detailed('Exchange Primitive LP', 'ePULP',  18), ERC20 {
    using SafeMath for uint256;

    event AddLiquidity(address indexed user, uint256 liquidity, uint256 tokens);

    IPrimeOption public _prime;

    constructor (address primeOption) public {
        _prime = IPrimeOption(primeOption);
    }

    receive() external payable {}

    /**
     * @dev adds option tokens and ether to reserves and sends user ePULP
     */
    function addLiquidity(
        uint256 minQLiquidity,
        uint256 maxQTokens
    ) public payable returns(uint256) {
        uint256 totalSupply = totalSupply();
        uint256 etherReserves = etherReserves();
        require(minQLiquidity > 0 && maxQTokens > 0, "ERR_ZERO");
        if (totalSupply > 0) {
            uint256 rEth = etherReserves.sub(msg.value);
            uint256 rToken = tokenReserves();
            uint256 qToken = msg.value.mul(rToken).div(rEth).sub(1);
            /* uint256 newLiquidity = msg.value.mul(totalSupply).div(rEth); */
            uint256 newLiquidity = newLiquidity(msg.value);
            assert(newLiquidity >= minQLiquidity && maxQTokens >= qToken);
            _mint(msg.sender, newLiquidity);
            _prime.transferFrom(msg.sender, address(this), qToken);
            emit AddLiquidity(msg.sender, newLiquidity, qToken);
            return newLiquidity;
        } else {
            require(etherReserves > 0, "ERR_ZERO");
            uint256 initialQLiquidity = etherReserves;
            _mint(msg.sender, initialQLiquidity);
            _prime.transferFrom(msg.sender, address(this), maxQTokens);
            emit AddLiquidity(msg.sender, initialQLiquidity, maxQTokens);
            return initialQLiquidity;
        }
    }

    /**
     * @dev removes option tokens and ether from reserves, burns ePulp, and sends to user
     */
    function removeLiquidity(
        uint256 qLiquidity,
        uint256 minQEth,
        uint256 minQTokens
    ) public returns (uint256, uint256) {
        require(qLiquidity > 0 &&  minQEth > 0 && minQTokens > 0, 'ERR_ZERO');

        uint256 etherReserves = etherReserves();
        uint256 totalSupply = totalSupply();
        uint256 tokenReserves = tokenReserves();
        /* uint256 qEth = qLiquidity.mul(etherReserves).div(totalSupply);
        uint256 qTokens = qLiquidity.mul(tokenReserves).div(totalSupply); */
        uint256 qEth = ethLiquidity(qLiquidity);
        uint256 qTokens = tokenLiquidity(qLiquidity);
        require(qEth >= minQEth, 'ERR_BAL_ETH');
        require(qTokens >= minQTokens, 'ERR_BAL_TOKENS');
        _burn(msg.sender, qLiquidity);
        _prime.transfer(msg.sender, qTokens);
        sendEther(msg.sender, qEth);
        return (qLiquidity, qEth);
    }

    /**
     * @dev sells option tokens for eth
     */
    function swapTokensToEth(
        uint256 qTokens,
        uint256 minQEth,
        address payable receiver
    ) public returns (uint) {
        require(minQEth > 0, "ERR_ZERO");
        require(_prime.balanceOf(msg.sender) >= qTokens, 'ERR_BAL_OPTIONS');
        return tokensToEth(qTokens, minQEth, msg.sender, receiver);
    }

    /**
     * @dev sells option tokens for eth
     */
    function tokensToEth(
        uint256 qTokens,
        uint256 minQEth,
        address buyer,
        address payable receiver
    ) public returns (uint) {
        uint256 rInput = tokenReserves();
        uint256 etherReserves = etherReserves();
        uint256 ethOutput = getInputPrice(qTokens, rInput, etherReserves);
        require(ethOutput >= minQEth, 'ERR_BAL_ETH');
        _prime.transferFrom(buyer, address(this), qTokens);
        sendEther(receiver, ethOutput);
        return ethOutput;
    }

    /**
     * @dev sells eth for option tokens
     */
    function swapEthToTokens(
        uint256 qTokens
    ) public payable returns (uint256) {
        require(qTokens > 0 && msg.value > 0, "ERR_ZERO");
        uint256 maxQEth = msg.value;
        uint256 tokenReserves = tokenReserves();
        uint256 etherReserves = etherReserves();
        uint256 ethOutput = getOutputPrice(qTokens, etherReserves.sub(maxQEth), tokenReserves);
        uint256 ethRemainder = maxQEth.sub(ethOutput);
        if(ethRemainder > 0) {
            sendEther(msg.sender, ethRemainder);
        }

        _prime.transfer(msg.sender, qTokens);
        return ethOutput;
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
    ) public pure returns (uint256) {
        uint256 k = qInput.mul(1000).mul(rOutput);
        uint256 x = rInput.mul(1000).add(qInput);
        uint256 y = k.div(x);
        return y;
    }

    /**
     * @dev gets the output price (amount of eth sold)
     */
    function getOutputPrice(
        uint256 qOutput,
        uint256 rInput,
        uint256 rOutput
    ) public pure returns (uint256) {
        uint256 k = qOutput.mul(1000).mul(rInput);
        uint256 y = (rOutput.sub(qOutput)).mul(1000);
        uint256 x = k.div(y).add(1);
        return x;
    }

    function tokenReserves() public view returns (uint256) {
        return _prime.balanceOf(address(this));
    }

    function etherReserves() public view returns (uint256) {
        return address(this).balance;
    }

    function newLiquidity(uint256 amount) public view returns (uint256) {
        uint256 totalSupply = totalSupply();
        uint256 etherReserves = etherReserves();
        uint256 newEtherReserves = etherReserves.sub(amount);
        if(newEtherReserves == 0) {
            return uint256(0);
        } else {
            return amount.mul(totalSupply).div(newEtherReserves); 
        }
    }

    function newTokens(uint256 amount) public view returns (uint256) {
        uint256 tokenReserves = tokenReserves();
        uint256 etherReserves = etherReserves();
        uint256 newEtherReserves = etherReserves.sub(amount);
        if(newEtherReserves == 0) {
            return uint256(0);
        } else {
            return amount.mul(tokenReserves).div(newEtherReserves).sub(1); 
        }
    }

    function ethLiquidity(uint256 amount) public view returns (uint256) {
        uint256 etherReserves = etherReserves();
        uint256 totalSupply = totalSupply();
        if(totalSupply == 0) {
            return uint256(0);
        } else {
            return amount.mul(etherReserves).div(totalSupply);
        } 
    }

    function tokenLiquidity(uint256 amount) public view returns (uint256) {
        uint256 tokenReserves = tokenReserves();
        uint256 totalSupply = totalSupply();
        if(totalSupply == 0) {
            return uint256(0);
        } else {
            return amount.mul(tokenReserves).div(totalSupply);
        } 
    }
}