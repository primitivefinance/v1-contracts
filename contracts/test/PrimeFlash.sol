pragma solidity ^0.6.2;

import "../interfaces/IPrime.sol";
import "../interfaces/IPrimeFlash.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PrimeFlash is IPrimeFlash {
    using SafeMath for uint;

    address public tokenP;

    constructor(address _tokenP) public {
        tokenP = _tokenP;
    }

    function goodFlashLoan(uint amount) external {
        // trigger the fallback function
        IPrime(tokenP).exercise(address(this), amount, new bytes(1));
    }

    function badFlashLoan(uint amount) external {
        // trigger the fallback function
        IPrime(tokenP).exercise(address(this), amount, new bytes(2));
    }

    function primitiveFlash(
        address receiver,
        uint outTokenU,
        bytes calldata data
    ) external override{
        // just return the tokenU to the prime contract
        (address tokenU, address tokenS, , uint base, uint price,) = IPrime(tokenP).prime();
        uint payment = outTokenU.div(1000).mul(price).div(base);
        bool good = keccak256(abi.encodePacked(data)) == keccak256(abi.encodePacked(new bytes(1)));
        if(good) {
            IERC20(tokenU).transfer(tokenP, outTokenU);
            IERC20(tokenS).transfer(tokenP, payment);
        }
    }
}