pragma solidity ^0.6.2;

/**
 * @title Primitive's Exchange Pool Creator Contract
 * @author Primitive
 */

import './ControllerInterface.sol';
import { IPrimeOption } from '../PrimeInterface.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract ControllerMarket is Ownable {

    struct Initialization {
        bool controllers;
        bool maker;
        bool perpetual;
        bool redeem;
    }

    struct Market {
        address controller;
        uint256 tokenId;
        address option;
        address exchange;
        address maker;
        address perpetual;
    }

    struct Controllers {
        address controller;
        address exchange;
        address option;
        address pool;
        address perpetual;
        address redeem;
    }

    Initialization public _isInitialized;
    Controllers public _controllers;
    mapping(uint256 => Market) public _markets;
    address public _maker;
    address public _perpetual;
    address public _crRedeem;
    address public _prRedeem;

    constructor() public {

    }

    function initControllers(
        IControllerExchange exchange,
        IControllerOption option,
        IControllerPool pool,
        IControllerPerpetual perpetual,
        IControllerRedeem redeem
    ) public onlyOwner returns (bool) {
        require(!_isInitialized.controllers, "ERR_INITIALIZED");
        _controllers = Controllers(
            address(this),
            address(exchange),
            address(option),
            address(pool),
            address(perpetual),
            address(redeem)
        );
        _isInitialized.controllers = true;
        return true;
    }

    function initMakerPool(address compoundContract) public onlyOwner returns (address) {
        require(!_isInitialized.maker, "ERR_INITIALIZED");
        address maker = _addMarketMaker(compoundContract);
        _isInitialized.maker = true;
        return maker;
    }

    function initPerpetual(address compoundContract) public onlyOwner returns (address) {
        require(!_isInitialized.perpetual, "ERR_INITIALIZED");
        address perpetual = _addPerpetualMarket(compoundContract);
        _isInitialized.perpetual = true;
        return perpetual;
    }

    function initPrimeRedeem() public onlyOwner returns (address, address) {
        require(!_isInitialized.redeem, "ERR_INITIALIZED");
        IControllerRedeem redeem = IControllerRedeem(_controllers.redeem);
        address crRedeem = redeem.addRedeem("Call Redeem Primitive Underlying LP", "crPulp", true);
        address prRedeem = redeem.addRedeem("Put Redeem Primitive Underlying LP", "prPulp", false);
        _crRedeem = crRedeem;
        _prRedeem = prRedeem;
        _isInitialized.redeem = true;
        return (crRedeem, prRedeem);
    }
    

    function createMarket(
        uint256 qUnderlying,
        IERC20 aUnderlying,
        uint256 qStrike,
        IERC20 aStrike,
        uint256 tExpiry,
        string memory name,
        bool isEthCallOption,
        bool isTokenOption
        
    ) public onlyOwner returns (uint256) {
        IControllerOption optionController = IControllerOption(_controllers.option);
        address payable option = optionController.addOption(
            qUnderlying,
            aUnderlying,
            qStrike,
            aStrike,
            tExpiry,
            name,
            isEthCallOption,
            isTokenOption
        );

        uint256 tokenId = IPrimeOption(option)._parentToken();
        address exchange = _addExchange(option);
        optionController.setExchange(exchange, option);
        
        IControllerRedeem redeem = IControllerRedeem(_controllers.redeem);
        if(isEthCallOption) {
            redeem.setValid(option, _crRedeem);
        } else if (isTokenOption) {
            // TESTING - PERPETUAL PUT SO SETTING TO PUT - FIX
            redeem.setValid(option, _prRedeem);
        } else {
            redeem.setValid(option, _prRedeem);
        }
        

        IControllerPool pool = IControllerPool(_controllers.pool);
        pool.addMarket(option);

        // For Testing
        IControllerPerpetual perpetual = IControllerPerpetual(_controllers.perpetual);
        perpetual.addMarket(option);

        _markets[tokenId] = Market(
            address(this),
            tokenId,
            option,
            exchange,
            _maker,
            _perpetual
        );
        
        return tokenId;
    }

    function _addExchange(
        address payable primeOption
    ) internal returns (address) {
        IControllerExchange exchange = IControllerExchange(_controllers.exchange);
        address exchangeAddress = exchange.addExchange(primeOption);
        return exchangeAddress;
    }

    function _addMarketMaker(
        address compoundEther
    ) internal returns (address) {
        IControllerPool pool = IControllerPool(_controllers.pool);
        address poolAddress = pool.addPool(compoundEther);
        _maker = poolAddress;
        return poolAddress;
    }

    function _addPerpetualMarket(
        address compoundEther
    ) internal returns (address) {
        IControllerPerpetual perpetual = IControllerPerpetual(_controllers.perpetual);
        address perpetualAddress = perpetual.addPerpetual(compoundEther);
        _perpetual = perpetualAddress;
        return perpetualAddress;
    }

    function getOption(uint256 tokenId) public view returns (address) {
        return _markets[tokenId].option;
    }

    function getExchange(uint256 tokenId) public view returns (address) {
        return _markets[tokenId].exchange;
    }

    function getMaker(uint256 tokenId) public view returns (address) {
        return _markets[tokenId].maker;
    }

    function getPerpetual(uint256 tokenId) public view returns (address) {
        return _markets[tokenId].perpetual;
    }
}