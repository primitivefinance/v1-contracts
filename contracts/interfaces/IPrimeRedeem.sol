pragma solidity ^0.6.2;

interface IPrimeRedeem {
    function tokenS() external view returns (address);
    function tokenP() external view returns (address);
    function factory() external view returns (address);
    function mint(address user, uint256 amount) external returns (bool);
    function burn(address user, uint256 amount) external returns (bool);
}