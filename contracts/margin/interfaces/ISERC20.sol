pragma solidity >=0.6.2;

interface ISERC20 {
    function initialize(address asset, address houseAddress) external;

    function mint(address to, uint256 quantity) external returns (bool);

    function burn(address to, uint256 quantity) external returns (bool);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);
}
