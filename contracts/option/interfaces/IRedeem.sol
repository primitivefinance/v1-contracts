pragma solidity ^0.6.2;

interface IRedeem {
    function tokenP() external view returns (address);
    function factory() external view returns (address);
    function underlying() external view returns (address);
    function mint(address user, uint256 amount) external;
    function burn(address user, uint256 amount) external;
}