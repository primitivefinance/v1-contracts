// SPDX-License-Identifier: MIT

pragma solidity ^0.6.2;

import "./ICToken.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CTokenLike is ICToken, ERC20 {
    using SafeMath for uint;

    address public override underlying;

    constructor(
        address _underlying,
        string memory name,
        string memory symbol
    ) public ERC20(name, symbol) {
        underlying = _underlying;
    }

    function mint(uint mintAmount) external override returns (uint) {
        require(IERC20(underlying).balanceOf(msg.sender) >= mintAmount, "ERR_BAL_UNDERLYING");
        _mint(msg.sender, mintAmount);
        IERC20(underlying).transferFrom(msg.sender, address(this), mintAmount);
        return uint(0);
    }

    function redeemUnderlying(uint redeemAmount) external override returns (uint) {
        require(balanceOf(msg.sender) >= redeemAmount, "ERR_BAL_CTOKEN");
        _burn(msg.sender, redeemAmount);
        bool success = IERC20(underlying).transfer(msg.sender, redeemAmount);
        if (success) {
            return 0;
        } else return 1;
    }

    function balanceOfUnderlying(address owner) external override view returns (uint) {
        return balanceOf(owner);
    }
}
