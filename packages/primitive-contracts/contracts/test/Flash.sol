pragma solidity ^0.6.2;

import "../option/interfaces/IOption.sol";
import "../option/interfaces/IFlash.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Flash is IFlash {
    using SafeMath for uint;

    address public tokenP;

    constructor(address _tokenP) public {
        tokenP = _tokenP;
    }

    function goodFlashLoan(uint amount) external {
        // trigger the fallback function
        IOption(tokenP).exercise(address(this), amount, new bytes(1));
    }

    function badFlashLoan(uint amount) external {
        // trigger the fallback function
        IOption(tokenP).exercise(address(this), amount, new bytes(2));
    }

    function primitiveFlash(
        address receiver,
        uint outTokenU,
        bytes calldata data
    ) external override{
        // just return the tokenU to the option contract
        (address tokenU, address tokenS, , uint base, uint price,) = IOption(tokenP).getOption();
        uint payment = outTokenU.div(1000).mul(price).div(base);
        bool good = keccak256(abi.encodePacked(data)) == keccak256(abi.encodePacked(new bytes(1)));
        if(good) {
            IERC20(tokenU).transfer(tokenP, outTokenU);
            IERC20(tokenS).transfer(tokenP, payment);
        }
    }
}