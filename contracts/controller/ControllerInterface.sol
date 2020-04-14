pragma solidity ^0.6.2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IControllerExchange {
    function addExchange(address primeOption) external returns (address);
}

interface IControllerPool {
    function addPool(address compoundEther) external returns (address);
}

interface IControllerRedeem {
    function addRedeem(string calldata name, string calldata symbol, bool isCallOption) external returns (address);
}

interface IControllerOption {
    function addEthOption(
        uint256 qEth,
        uint256 qToken,
        IERC20 aToken,
        uint256 tExpiry,
        bool isCall,
        string calldata name
    ) external payable returns (address);

    function addTokenOption(
        uint256 qUnderlying,
        IERC20 aUnderlying,
        uint256 qStrike,
        IERC20 aStrike,
        uint256 tExpiry,
        string calldata name
    ) external returns (address);
}