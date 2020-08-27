// SPDX-License-Identifier: MIT

pragma solidity 0.6.2;

interface IRegistry {
    function pauseDeployments() external;

    function unpauseDeployments() external;

    function deployOption(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external returns (address);

    function setOptionFactory(address optionFactory_) external;

    function setRedeemFactory(address redeemFactory_) external;

    function optionFactory() external returns (address);

    function redeemFactory() external returns (address);

    function verifyToken(address tokenAddress) external;

    function verifyExpiry(uint256 expiry) external;

    function unverifyToken(address tokenAddress) external;

    function unverifyExpiry(uint256 expiry) external;

    function calculateOptionAddress(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external view returns (address);

    function getOptionAddress(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) external view returns (address);

    function isVerifiedOption(address optionAddress)
        external
        view
        returns (bool);
}
