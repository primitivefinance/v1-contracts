pragma solidity ^0.6.2;

interface IPrimePerpetual {
    function deposit(uint inTokenU) external returns (uint outTokenPULP, bool success);
    function withdraw(uint inTokenPULP) external returns (bool);
    function mint(uint inTokenS) external returns (bool);
    function redeem(uint inTokenP) external returns (bool);
    function exercise(uint inTokenP) external returns (bool);
    function interestBalances() external view returns (uint balanceU, uint balanceR);
    function totalBalance() external view returns (uint totalBalance);
    function fee() external view returns (uint);
    function cusdc() external view returns (address);
    function cdai() external view returns (address);
}