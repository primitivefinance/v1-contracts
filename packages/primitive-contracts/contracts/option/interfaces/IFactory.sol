pragma solidity ^0.6.2;

interface IFactory {
    function deploy(
        address tokenU,
        address tokenS,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external returns (address);

    function kill(address option) external;

    function initialize(address option, address redeem) external;
}
