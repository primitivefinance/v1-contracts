pragma solidity ^0.6.2;

/**
 * @title Primitive's Contracts' Interfaces
 * @author Primitive
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPrime {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function createPrime(
        uint256 qUnderlying,
        address aUnderlying,
        uint256 qStrike,
        address aStrike,
        uint256 tExpiry,
        address receiver
    ) external payable returns (uint256 tokenId);
    function exercise(uint256 tokenId) external payable returns (bool);
    function close(uint256 tokenToClose, uint256 tokenToBurn) external returns (bool);
    function withdraw(uint256 amount, address asset) external returns (bool);
    function getPrime(uint256 tokenId) external view returns(
            address writer,
            uint256 qUnderlying,
            address aUnderlying,
            uint256 qStrike,
            address aStrike,
            uint256 tExpiry,
            address receiver,
            bytes4 series,
            bytes4 symbol
        );
    function getSeries(uint256 tokenId) external view returns (bytes4 series);
    function isTokenExpired(uint256 tokenId) external view returns (bool);
}

interface IPrimeOption {
    function balanceOf(address user) external view returns (uint);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function deposit(uint256 amount) external payable returns (bool);
    function swap(uint256 qUnderlying) external returns (bool);
    function withdraw(uint256 qUnderlying) external returns (uint);
    function close(uint256 qUnderlying) external returns (bool);
    function _strikeAddress() external view returns (address);
    function _parentToken() external view returns (uint256);
    function _rPulp() external view returns (address);
    function getStrike() external view returns (address);
    function getUnderlying() external view returns (address);
    function getQuantityUnderlying() external view returns (uint256);
    function getQuantityStrike() external view returns (uint256);
    function isEthCallOption() external view returns (bool);
}

interface IPrimeRedeem {
    function mint(address user, uint256 amount) external payable returns (bool);
    function burn(address user, uint256 amount) external payable returns (bool);
    function balanceOf(address user) external view returns (uint);
    function isCallPulp() external view returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function redeem(uint256 amount) external returns (bool);
}
