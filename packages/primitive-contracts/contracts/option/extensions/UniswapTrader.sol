// SPDX-License-Identifier: MIT



pragma solidity ^0.6.2;

import {
    IUniswapV2Router02
} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {
    IUniswapV2Factory
} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { IOption } from "../interfaces/IOption.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract UniswapTrader is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public router;
    address public quoteToken;

    event UniswapTraderMint(
        address indexed from,
        address indexed option,
        uint256 mintQuantity
    );

    event UniswapTraderSell(
        address indexed from,
        address indexed to,
        address indexed option,
        uint256 sellQuantity
    );

    constructor() public {}

    /**
     * @dev The stablecoin "cash" token.
     */
    function setQuoteToken(address _quoteToken) external onlyOwner {
        quoteToken = _quoteToken;
    }

    /**
     * @dev The uniswap router for interacting with the pairs.
     */
    function setRouter(address _router) external onlyOwner {
        router = _router;
    }

    /**
     * @dev Mints options using underlyingTokens provided by user, then sells on uniswap.
     */
    function mintAndMarketSell(
        IOption option,
        uint256 sellQuantity,
        uint256 minQuote
    ) external {
        // sends underlyings to option contract and mint options
        mintOptions(msg.sender, option, sellQuantity);

        // market sells options on uniswap
        marketSell(
            msg.sender,
            msg.sender,
            address(option),
            sellQuantity,
            minQuote
        );

        // send redeem to user
        address redeemToken = option.redeemToken();
        IERC20(redeemToken).safeTransfer(
            msg.sender,
            IERC20(redeemToken).balanceOf(address(this))
        );
    }

    /**
     * @dev Internal function to safeTransferFrom underlying tokens,
     * from an address, send them to the option, and call mint() on the
     * option contract.
     */
    function mintOptions(
        address minter,
        IOption option,
        uint256 mintQuantity
    )
        internal
        returns (uint256 outputOptionTokens, uint256 outputRedeemTokens)
    {
        IERC20(option.underlyingToken()).safeTransferFrom(
            minter,
            address(option),
            mintQuantity
        );

        // mints options
        (outputOptionTokens, outputRedeemTokens) = option.mint(address(this));
        emit UniswapTraderMint(minter, address(option), mintQuantity);
    }

    /**
     * @dev Market sells option tokens into the uniswap pool for quote "cash" tokens.
     */
    function marketSell(
        address from,
        address to,
        address option,
        uint256 sellQuantity,
        uint256 minQuote
    ) internal returns (uint256[] memory amounts) {
        address[] memory path = new address[](2);
        path[0] = option;
        path[1] = quoteToken;
        IERC20(option).approve(router, uint256(-1));
        (amounts) = IUniswapV2Router02(router).swapExactTokensForTokens(
            sellQuantity,
            minQuote,
            path,
            to,
            getMaxDeadline()
        );
        emit UniswapTraderSell(from, to, option, sellQuantity);
    }

    /**
     * @dev The maxmium deadline available for each trade.
     */
    function getMaxDeadline() public view returns (uint256 deadline) {
        deadline = now + 15 minutes;
    }
}
