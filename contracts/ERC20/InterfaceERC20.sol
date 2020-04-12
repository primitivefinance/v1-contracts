pragma solidity ^0.6.2;

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
    ) external virtual returns (uint256 tokenId);
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
    function deposit() public payable virtual returns (bool);
    function depositAndSell() public payable virtual returns (uint);
    function swap(uint256 qUnderlying) public virtual returns (bool);
    function withdraw(uint256 qUnderlying) public virtual returns (uint);
    function close(uint256 qUnderlying) public virtual returns (bool);
    function _strikeAddress() public view virtual returns (address);
    ERC20 public _strike;
}