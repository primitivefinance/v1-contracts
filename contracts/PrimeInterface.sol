pragma solidity ^0.6.2;

/**
 * @title Primitive's Contract Interfaces
 * @author Primitive
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPrimeOption {
    function balanceOf(address user) external view returns (uint);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    function mint(uint256 amount) external returns (bool);
    function swap(uint256 amount) external returns (bool);
    function close(uint256 amount) external returns (bool);
    function withdraw(uint256 amount) external returns (uint);

    function tokenR() external view returns (address);
    function tokenS() external view returns (address);
    function tokenU() external view returns (address);
    function ratio() external view returns (uint256);
    function expiry() external view returns (address);
    function cacheU() external view returns (uint256);
    function cacheS() external view returns (uint256);
    function marketId() external view returns (uint256);
    function factory() external view returns (address);
    function getCaches() external view returns (uint256 _cacheU, uint256 _cacheS);
}

interface IPrimeRedeem {
    function mint(address user, uint256 amount) external payable returns (bool);
    function burn(address user, uint256 amount) external payable returns (bool);
    function balanceOf(address user) external view returns (uint);
    function isCallPulp() external view returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function redeem(uint256 amount) external returns (bool);
}
