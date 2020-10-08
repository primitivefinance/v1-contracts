pragma solidity >=0.6.2;

interface ISERC20 {
    function initialize(address houseAddress) external;

    function mint(address to, uint256 quantity) external returns (bool);

    function burn(address to, uint256 quantity) external returns (bool);
}
