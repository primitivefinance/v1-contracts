pragma solidity ^0.6.2;

/**
 * @title Primitive's Exchange Pool Creator Contract
 * @author Primitive
 */

import "./ControllerInterface.sol";
import { IPrimeOption } from "../PrimeInterface.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

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
        address maker;
        address perpetual;
    }

    struct Controllers {
        address controller;
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

    function initControllers(
        IControllerOption option,
        IControllerPool pool,
        IControllerPerpetual perpetual,
        IControllerRedeem redeem
    ) public onlyOwner returns (bool) {
        require(!_isInitialized.controllers, "ERR_INITIALIZED");
        _controllers = Controllers(
            address(this),
            address(option),
            address(pool),
            address(perpetual),
            address(redeem)
        );
        _isInitialized.controllers = true;
        return true;
    }

    function initMakerPool(address compoundContract, address oracle) public onlyOwner returns (address) {
        require(!_isInitialized.maker, "ERR_INITIALIZED");
        address maker = _addMarketMaker(compoundContract, oracle);
        _isInitialized.maker = true;
        return maker;
    }

    function initPerpetual(address compoundContract) public onlyOwner returns (address) {
        require(!_isInitialized.perpetual, "ERR_INITIALIZED");
        address perpetual = _addPerpetualMarket(compoundContract);
        _isInitialized.perpetual = true;
        return perpetual;
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

        // Deploys option contract and mints prime erc-721
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

        // Deploys redeem contract
        IControllerRedeem redeemController = IControllerRedeem(_controllers.redeem);
        address redeem = redeemController.addRedeem(
            "Redeem Primitive Underlying LP",
            "rPULP",
            option,
            aStrike
        );
        optionController.setRedeem(redeem, option);

        // Adds option to pool contract
        IControllerPool pool = IControllerPool(_controllers.pool);
        pool.addMarket(option);

        // For Testing
        /* IControllerPerpetual perpetual = IControllerPerpetual(_controllers.perpetual);
        perpetual.addMarket(option); */

        uint256 tokenId = IPrimeOption(option)._parentToken();
        _markets[tokenId] = Market(
            address(this),
            tokenId,
            option,
            _maker,
            _perpetual
        );

        return tokenId;
    }

    function _addMarketMaker(
        address compoundEther,
        address oracle
    ) internal returns (address) {
        IControllerPool pool = IControllerPool(_controllers.pool);
        address poolAddress = pool.addPool(compoundEther, oracle);
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

    function getMaker(uint256 tokenId) public view returns (address) {
        return _markets[tokenId].maker;
    }

    function getPerpetual(uint256 tokenId) public view returns (address) {
        return _markets[tokenId].perpetual;
    }
}