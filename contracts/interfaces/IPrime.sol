pragma solidity ^0.6.2;

interface IPrime {
    function mint(address receiver) external returns (
        uint inTokenU,
        uint outTokenR
    );
    function exercise(address receiver, uint outTokenU, bytes calldata data) external returns (
        uint inTokenS,
        uint inTokenP
    );
    function redeem(address receiver) external returns (
        uint inTokenR
    );
    function close(address receiver) external returns (
        uint inTokenR,
        uint inTokenP,
        uint outTokenU
    );

    function tokenR() external view returns (address);
    function tokenS() external view returns (address);
    function tokenU() external view returns (address);
    function base() external view returns (uint);
    function price() external view returns (uint);
    function expiry() external view returns (uint);
    function cacheU() external view returns (uint);
    function cacheS() external view returns (uint);
    function factory() external view returns (address);
    function maxDraw() external view returns (uint draw);
    function getCaches() external view returns (uint _cacheU, uint _cacheS);
    function getTokens() external view returns (address _tokenU, address _tokenS, address _tokenR);
    function prime() external view returns (
            address _tokenS,
            address _tokenU,
            address _tokenR,
            uint _base,
            uint _price,
            uint _expiry
    );
}