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
        bool redeem;
    }

    struct Market {
        address controller;
        uint256 tokenId;
        address option;
        address exchange;
        address maker;
    }

    struct Controllers {
        address controller;
        address exchange;
        address option;
        address pool;
        address redeem;
    }

    Initialization public _isInitialized;
    Controllers public _controllers;
    mapping(uint256 => Market) public _markets;
    address public _maker;
    address public _crRedeem;
    address public _prRedeem;

    constructor() public {

    }

    function initControllers(
        IControllerExchange exchange,
        IControllerOption option,
        IControllerPool pool,
        IControllerRedeem redeem
    ) public onlyOwner returns (bool) {
        require(!_isInitialized.controllers, "ERR_INITIALIZED");
        _controllers = Controllers(
            address(this),
            address(exchange),
            address(option),
            address(pool),
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
        uint256 qEth,
        uint256 qToken,
        IERC20 aToken,
        uint256 tExpiry,
        bool isCall,
        string memory name
    ) public onlyOwner returns (uint256) {
        address option = _addEthOption(
            qEth,
            qToken,
            aToken,
            tExpiry,
            isCall,
            name
        );
        uint256 tokenId = IPrimeOption(option)._parentToken();
        address exchange = _addExchange(option);
        _markets[tokenId] = Market(
            address(this),
            tokenId,
            option,
            exchange,
            _maker
        );
        return tokenId;
    }

    function _addTokenOption(
        uint256 qUnderlying,
        IERC20 aUnderlying,
        uint256 qStrike,
        IERC20 aStrike,
        uint256 tExpiry,
        string memory name
    ) internal returns (address) {
        IControllerOption option = IControllerOption(_controllers.option);
        address primeOption = option.addTokenOption(
            qUnderlying,
            aUnderlying,
            qStrike,
            aStrike,
            tExpiry,
            name
        );
        return primeOption;
    }

    function _addEthOption(
        uint256 qEth,
        uint256 qToken,
        IERC20 aToken,
        uint256 tExpiry,
        bool isCall,
        string memory name
    ) internal returns (address) {
        IControllerOption option = IControllerOption(_controllers.option);
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

    function _addExchange(
        address primeOption
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

    function getOption(uint256 tokenId) public view returns (address) {
        return _markets[tokenId].option;
    }

    function getExchange(uint256 tokenId) public view returns (address) {
        return _markets[tokenId].exchange;
    }

    function getMaker(uint256 tokenId) public view returns (address) {
        return _markets[tokenId].maker;
    }
}