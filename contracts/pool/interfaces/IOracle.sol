pragma solidity ^0.6.2;
interface IOracle {
    function marketPrice() external view returns (uint256 market);
    function calculateIntrinsic(
        address tokenU,
        address tokenS,
        uint256 base,
        uint256 quote
    ) external view returns (uint256 intrinsic);
    function calculateExtrinsic(
        address tokenU,
        address tokenS,
        uint256 volatility,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external view returns (uint256 extrinsic);
    function calculatePremium(
        address tokenU,
        address tokenS,
        uint256 volatility,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external view returns (uint256 premium);
}
