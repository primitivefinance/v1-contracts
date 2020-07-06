pragma solidity ^0.6.2;

interface IPool {
    function kill() external returns (bool);

    function balances()
        external
        view
        returns (uint256 balanceU, uint256 balanceR);

    function factory() external view returns (address);

    function tokenP() external view returns (address);
}
