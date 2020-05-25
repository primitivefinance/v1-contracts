pragma solidity ^0.6.2;

interface IPrimePool {
    function kill() external returns (bool);
    function balances() external view returns (uint balanceU, uint balanceR);
    function factory() external view returns (address);
    function tokenP() external view returns (address);
}