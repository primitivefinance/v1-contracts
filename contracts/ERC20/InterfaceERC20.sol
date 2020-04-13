pragma solidity ^0.6.2;

/**
 * @title Primitive's Contracts' Interfaces
 * @author Primitive
 */

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

abstract contract IPrime {
    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual;
    function createPrime(
        uint256 qUnderlying,
        address aUnderlying,
        uint256 qStrike,
        address aStrike,
        uint256 tExpiry,
        address receiver
    ) external payable virtual returns (uint256 tokenId);
    function exercise(uint256 tokenId) external payable virtual returns (bool);
    function close(uint256 tokenToClose, uint256 tokenToBurn) external virtual returns (bool);
    function withdraw(uint256 amount, address asset) public virtual returns (bool);
    function getPrime(uint256 tokenId) external view virtual returns(
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
    function getSeries(uint256 tokenId) external view virtual returns (bytes4 series);
    function isTokenExpired(uint256 tokenId) public view virtual returns (bool);
}

abstract contract IPrimeERC20 {
    function balanceOf(address user) public view virtual returns (uint);
    function transferFrom(address from, address to, uint256 amount) public virtual returns (bool);
    function transfer(address to, uint256 amount) public virtual returns (bool);
    function deposit(uint256 amount) public payable virtual returns (bool);
    function depositAndMarketSell(uint256 amount) public payable virtual returns (uint);
    function depositAndLimitSell(uint256 amount, uint256 askPrice) public payable virtual returns (uint);
    function swap(uint256 qUnderlying) public virtual returns (bool);
    function withdraw(uint256 qUnderlying) public virtual returns (uint);
    function close(uint256 qUnderlying) public virtual returns (bool);
    function _strikeAddress() public view virtual returns (address);
    ERC20 public _strike;
}

abstract contract IRPulp {
    function mint(address user, uint256 amount) public payable virtual returns (bool);
    function burn(address user, uint256 amount) public payable virtual returns (bool);
    function balanceOf(address user) public view virtual returns (uint);
}

abstract contract IEPulp {
    function addLiquidity(
        uint256 minQLiquidity,
        uint256 maxQTokens
    ) public payable virtual returns(uint256);
    function removeLiquidity(
        uint256 qLiquidity,
        uint256 minQEth,
        uint256 minQTokens
    ) public virtual returns (uint256, uint256);
    function swapTokensToEth(
        uint256 qTokens,
        uint256 minQEth,
        address payable receiver
    ) public virtual returns (uint);
    function swapEthToTokens(
        uint256 qTokens
    ) public payable virtual returns (uint256);
    function getInputPrice(
        uint256 qInput,
        uint256 rInput,
        uint256 rOutput
    ) public view virtual returns (uint256);
    function getOutputPrice(
        uint256 qOutput,
        uint256 rInput,
        uint256 rOutput
    ) public view virtual returns (uint256);
    function tokenReserves() public view virtual returns (uint256);
    function etherReserves() public view virtual returns (uint256);

}