pragma solidity ^0.6.2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IControllerMarket {
    function _crRedeem() external view returns (address);
    function _prRedeem() external view returns (address);
    function getExchange(uint256 tokenId) external view returns (address);
}

interface IControllerExchange {
    function addExchange(address payable primeOption) external returns (address);
}

interface IControllerPool {
    function addPool(address compoundEther) external returns (address);
    function addMarket(address payable primeOption) external returns (address);
}

interface IControllerPerpetual {
    function addPerpetual(address compoundDai) external returns (address) ;
}

interface IControllerRedeem {
    function addRedeem(string calldata name, string calldata symbol, bool isCallOption) external returns (address);
    function setValid(address primeOption, address redeemAddress) external returns (bool);
}

interface IControllerOption {
    function addOption(
        uint256 qUnderlying,
        IERC20 aUnderlying,
        uint256 qStrike,
        IERC20 aStrike,
        uint256 tExpiry,
        string calldata name,
        bool isEthCallOption,
        bool isTokenOption
    ) external payable returns (address payable);

    function setExchange(address exchange, address payable primeOption) external returns (bool);
}