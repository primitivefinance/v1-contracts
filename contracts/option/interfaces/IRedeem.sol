// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IRedeem is IERC20 {
    function optionToken() external view returns (address);

    function factory() external view returns (address);

    function mint(address user, uint256 amount) external;

    function burn(address user, uint256 amount) external;

    function initialize(address _factory, address _optionToken) external;
}
