pragma solidity ^0.6.2;

interface IPrimitiveFactory {
    function feeReceiver() external view returns (address);
    function setFeeReceiver(address _feeReceiver) external;
}