pragma solidity ^0.6.2;

/**
 * @title Primitive's Exchange Pool Creator Contract
 * @author Primitive
 */

import './ControllerInterface.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract ControllerMarket is Ownable {

    constructor() public {

    }

    function addOption(
        address controllerOption,
        uint256 qEth,
        uint256 qToken,
        IERC20 aToken,
        uint256 tExpiry,
        bool isCall,
        string memory name
    ) public onlyOwner returns (address) {
        IControllerOption option = IControllerOption(controllerOption);
        address primeOption = option.addEthOption(
            qEth,
            qToken,
            aToken,
            tExpiry,
            isCall,
            name
        );
        return primeOption;
    }

    function addMarket(
        address primeOption,
        address compoundEther,
        address controllerExchange,
        address controllerPool
    ) public onlyOwner returns (address, address, address) {
        IControllerExchange exchange = IControllerExchange(controllerExchange);
        address exchangeAddress = exchange.addExchange(primeOption);
        IControllerPool pool = IControllerPool(controllerPool);
        address poolAddress = pool.addPool(primeOption, compoundEther);
        return (primeOption, exchangeAddress, poolAddress);
    }
}