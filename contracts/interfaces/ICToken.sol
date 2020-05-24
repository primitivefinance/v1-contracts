pragma solidity ^0.6.2;

interface ICToken {
    function mint(uint mintAmount) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
    function underlying() external view returns (address);
}