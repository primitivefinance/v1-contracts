pragma solidity ^0.6.2;

/**
 * @dev Uniswap Factory like contract.
 */

interface UniswapFactoryInterface {
    // Create Exchange
    function createExchange(address token) external returns (address exchange);
    // Get Exchange and Token Info
    function getExchange(address token) external view returns (address exchange);
}

contract UniFactoryLike is UniswapFactoryInterface {

    UniswapFactoryInterface public factory;

    constructor(UniswapFactoryInterface _factory) public {
        factory = _factory;
    }

    function getExchange(address token) external view override returns (address exchange) {
        exchange = factory.getExchange(token);
    }

    function createExchange(address token) external override returns (address exchange) {
        exchange = factory.createExchange(token);
    }

}