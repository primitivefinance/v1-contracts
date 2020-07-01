pragma solidity ^0.6.2;

interface IOption {
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
    function quote() external view returns (uint);
    function expiry() external view returns (uint);
    function cacheU() external view returns (uint);
    function cacheS() external view returns (uint);
    function factory() external view returns (address);
    function getCaches() external view returns (uint _cacheU, uint _cacheS);
    function getTokens() external view returns (address _tokenU, address _tokenS, address _tokenR);
    function getOption() external view returns (
            address _tokenS,
            address _tokenU,
            address _tokenR,
            uint _base,
            uint _quote,
            uint _expiry
    );
    function initTokenR(address _tokenR) external;
    function FEE() external view returns (uint);
}