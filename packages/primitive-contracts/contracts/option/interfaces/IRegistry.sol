pragma solidity ^0.6.2;

interface IRegistry {
    function deployOption(
        address tokenU,
        address tokenS,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external returns (address);

    function kill(address option) external;

    function initialize(address _factory, address _factoryRedeem) external;

    function optionsLength() external view returns (uint256 len);

    function addSupported(address token) external;
}
