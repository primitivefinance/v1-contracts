pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IControllerPool {
    function makerFor(address tokenU, address tokenS) external view returns (address payable);
    function addPool(
        address oracle,
        string calldata name,
        string calldata symbol,
        address tokenU,
        address tokenS
    ) external returns (address payable);
    function addMarket(address maker, address tokenP) external returns (address);
}

interface IControllerRedeem {
    function addRedeem(
        string calldata name,
        string calldata symbol,
        address tokenP,
        address tokenS
    ) external returns (address);
}

interface IControllerOption {
    function addOption(
        string calldata name,
        string calldata symbol,
        address tokenU,
        address tokenS,
        uint256 ratio,
        uint256 expiry
    ) external returns (address, uint256);

    function setRedeem(address tokenR, address tokenP) external returns (bool);
}