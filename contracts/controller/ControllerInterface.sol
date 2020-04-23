pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IControllerMarket {
    function _crRedeem() external view returns (address);
    function _prRedeem() external view returns (address);
}

interface IControllerPool {
    function addPool(address compoundEther, address oracle) external returns (address);
    function addMarket(address payable primeOption) external returns (address);
}

interface IControllerRedeem {
    function addRedeem(
        string calldata name,
        string calldata symbol,
        address payable optionAddress,
        IERC20 strikeAddress
    ) external returns (address);
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

    function setRedeem(address redeem, address payable primeOption) external returns (bool);
}