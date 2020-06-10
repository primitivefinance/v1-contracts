pragma solidity ^0.6.2;

import "../interfaces/IPrimeOracle.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniRouter {
    using SafeMath for uint;

    IERC20 public tokenA;
    IERC20 public weth;
    address public oracle;

    constructor(IERC20 _tokenA, IERC20 _weth, address _oracle) public {
        tokenA = _tokenA;
        weth = _weth;
        oracle = _oracle;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        uint market = IPrimeOracle(oracle).marketPrice();
        uint amountOut = path[0] == address(weth) ? market : amountIn.mul(1 ether).div(market);
        require(amountOut >= amountOutMin, "INSUFFICIENT_AMOUNT_OUT");
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[1]).transfer(msg.sender, amountOut);
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = amountOut;
    }
}