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

    function swap(address receiver) external returns (
        uint256 inTokenS,
        uint256 inTokenP,
        uint256 outTokenU
    );
    function mint(address receiver) external returns (
        uint256 inTokenU,
        uint256 outTokenR
    );
    function redeem(address receiver) external returns (
        uint256 inTokenR
    );
    function close(address receiver) external returns (
        uint256 inTokenR,
        uint256 inTokenP,
        uint256 outTokenU
    );

    function tokenR() external view returns (address);
    function tokenS() external view returns (address);
    function tokenU() external view returns (address);
    function base() external view returns (uint256);
    function price() external view returns (uint256);
    function expiry() external view returns (uint256);
    function cacheU() external view returns (uint256);
    function cacheS() external view returns (uint256);
    function factory() external view returns (address);
    function marketId() external view returns (uint256);
    function maxDraw() external view returns (uint256 draw);
    function getCaches() external view returns (uint256 _cacheU, uint256 _cacheS);
    function getTokens() external view returns (address _tokenU, address _tokenS, address _tokenR);
}

interface IPrimeTrader {
    function safeRedeem(address tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenR
    );
    function safeSwap(address tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenS,
        uint256 inTokenP,
        uint256 outTokenU
    );
    function safeMint(address tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenU,
        uint256 outTokenR
    );
    function safeClose(address tokenP, uint256 amount, address receiver) external returns (
        uint256 inTokenR,
        uint256 inTokenP,
        uint256 outTokenU
    );
}

interface IPrimeRedeem {
    function balanceOf(address user) external view returns (uint);
    function mint(address user, uint256 amount) external payable returns (bool);
    function burn(address user, uint256 amount) external payable returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
