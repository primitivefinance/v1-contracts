pragma solidity ^0.6.2;

/**
 * @title Primitive's Contracts' Interfaces
 * @author Primitive
 */

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

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
    function depositAndMarketSell(uint256 amount) external payable returns (uint);
    function depositAndLimitSell(uint256 amount, uint256 askPrice) external payable returns (uint);
    function swap(uint256 qUnderlying) external returns (bool);
    function withdraw(uint256 qUnderlying) external returns (uint);
    function close(uint256 qUnderlying) external returns (bool);
    function _strikeAddress() external view returns (address);
    function _parentToken() external view returns (uint256);
    function _rPulp() external view returns (address);
    function getStrike() external view returns (address);
    function getUnderlying() external view returns (address);
}

interface IPrimeRedeem {
    function mint(address user, uint256 amount) external payable returns (bool);
    function burn(address user, uint256 amount) external payable returns (bool);
    function balanceOf(address user) external view returns (uint);
    function isCallPulp() external view returns (bool);
}

interface IPrimeExchange {
    function addLiquidity(
        uint256 minQLiquidity,
        uint256 maxQTokens
    ) external payable returns(uint256);
    function removeLiquidity(
        uint256 qLiquidity,
        uint256 minQEth,
        uint256 minQTokens
    ) external returns (uint256, uint256);
    function swapTokensToEth(
        uint256 qTokens,
        uint256 minQEth,
        address payable receiver
    ) external returns (uint);
    function swapEthToTokens(
        uint256 qTokens
    ) external payable returns (uint256);
    function getInputPrice(
        uint256 qInput,
        uint256 rInput,
        uint256 rOutput
    ) external view returns (uint256);
    function getOutputPrice(
        uint256 qOutput,
        uint256 rInput,
        uint256 rOutput
    ) external view returns (uint256);
    function tokenReserves() external view returns (uint256);
    function etherReserves() external view returns (uint256);
}

interface IPrimePool {
    
}

interface IPrimePerpetual {
    
}
