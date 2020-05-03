pragma solidity ^0.6.2;

/**
 * @dev Uniswap Factory like contract.
 */

interface UniswapExchangeInterface {
    // Provide Liquidity
    function addLiquidity(uint256 min_liquidity, uint256 max_tokens, uint256 deadline) external payable returns (uint256);
    function removeLiquidity(uint256 amount, uint256 min_eth, uint256 min_tokens, uint256 deadline) external returns (uint256, uint256);
}


contract UniExchangeLike is UniswapExchangeInterface {

    UniswapExchangeInterface public exchange;

    constructor(UniswapExchangeInterface _exchange) public {
        exchange = _exchange;
    }

    function addLiquidity(uint256 min_liquidity, uint256 max_tokens, uint256 deadline) external payable override returns (uint256) {
        return exchange.addLiquidity(1, max_tokens, now + 1 minutes);
    }
    function removeLiquidity(uint256 amount, uint256 min_eth, uint256 min_tokens, uint256 deadline) external override returns (uint256, uint256) {
        return exchange.removeLiquidity(amount, min_eth, min_tokens, now + 1 minutes);
    }

}