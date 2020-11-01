pragma solidity >=0.6.0;

import {
    IUniswapV2Router02
} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {
    IUniswapV2Factory
} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { ITrader } from "../../option/interfaces/ITrader.sol";
import { IOption, IERC20 } from "../../option/interfaces/IOption.sol";

interface IUniswapConnector03 {
    // ==== Combo Operations ====

    function mintShortOptionsThenSwapToTokens(
        IOption optionToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (bool);

    // ==== Flash Open Functions ====

    function flashCloseLongOptionsThenSwap(
        address pairAddress,
        address optionAddress,
        uint256 flashLoanQuantity,
        uint256 minPayout,
        address[] calldata path,
        address to
    ) external returns (uint256, uint256);

    function flashMintShortOptionsThenSwap(
        address pairAddress,
        address optionAddress,
        uint256 flashLoanQuantity,
        uint256 maxPremium,
        address[] calldata path,
        address to
    ) external returns (uint256, uint256);

    function openFlashLong(
        IOption optionToken,
        uint256 amountOptions,
        uint256 amountOutMin
    ) external returns (bool);

    function closeFlashLong(
        IOption optionToken,
        uint256 amountRedeems,
        uint256 minPayout
    ) external returns (bool);

    // ==== Liquidity Functions ====

    function addShortLiquidityWithUnderlying(
        address optionAddress,
        address otherTokenAddress,
        uint256 quantityOptions,
        uint256 quantityOtherTokens,
        uint256 minShortTokens,
        uint256 minOtherTokens,
        address to,
        uint256 deadline
    ) external returns (bool);

    function removeShortLiquidityThenCloseOptions(
        address optionAddress,
        address otherTokenAddress,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256, uint256);

    // ==== Management Functions ====

    function deployUniswapMarket(address optionAddress, address otherToken)
        external
        returns (address);

    // ==== View ====

    function getUniswapMarketForTokens(address token0, address token1)
        external
        view
        returns (address);

    function router() external view returns (IUniswapV2Router02);

    function factory() external view returns (IUniswapV2Factory);

    function trader() external view returns (ITrader);

    function getName() external pure returns (string memory);

    function getVersion() external pure returns (uint8);
}
