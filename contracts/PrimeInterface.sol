pragma solidity ^0.6.2;

/**
 * @title Primitive's Contract Interfaces
 * @author Primitive
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPrime {
    function balanceOf(address user) external view returns (uint);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    function swap() external returns (bool);
    function mint() external returns (uint256 primes, uint256 redeems);
    function close(uint256 amount) external returns (bool);
    function withdraw(uint256 amount) external returns (uint);
    function safeSwap(uint256 amount) external returns (bool);
    function safeMint(uint256 amount) external returns (uint256 primes, uint256 redeems);

    function tokenR() external view returns (address);
    function tokenS() external view returns (address);
    function tokenU() external view returns (address);
    function ratio() external view returns (uint256);
    function expiry() external view returns (address);
    function cacheU() external view returns (uint256);
    function cacheS() external view returns (uint256);
    function factory() external view returns (address);
    function marketId() external view returns (uint256);
    function maxDraw() external view returns (uint256 draw);
    function getCaches() external view returns (uint256 _cacheU, uint256 _cacheS);
}

interface IPrimeRedeem {
    function balanceOf(address user) external view returns (uint);
    function approve(address spender, uint256 amount) external returns (bool);
    function mint(address user, uint256 amount) external payable returns (bool);
    function burn(address user, uint256 amount) external payable returns (bool);
}
