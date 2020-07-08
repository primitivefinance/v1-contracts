// SPDX-License-Identifier: MIT



pragma solidity ^0.6.2;

/**
 * @title   Oracle for Calculating The Prices of  Options
 * @author  Primitive
 */

import { IAggregator } from "../interfaces/IAggregator.sol";
import { IOracle } from "../interfaces/IOracle.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

contract Oracle is IOracle {
    using SafeMath for uint256;

    address public oracle;
    address public weth;

    uint256 public constant MANTISSA = 10**36;
    uint256 public constant ONE_ETHER = 1 ether;
    uint256 public constant MIN_PREMIUM = 10**3;
    uint256 public constant SECONDS_IN_DAY = 86400;

    constructor(address _oracle, address _weth) public {
        oracle = _oracle;
        weth = _weth;
    }

    /**
     * @dev Calculates the intrinsic + extrinsic value of the  option.
     * @notice Strike / Market * (Volatility * 1000) * sqrt(T in seconds remaining) / Seconds in a Day.
     * @param underlyingToken The address of the underlying asset.
     * @param strikeToken The address of the strike asset.
     * @param volatility The arbritary volatility as a percentage scaled by 1000.
     * @param base The quantity of the underlying asset. Also the quote of underlyingToken denomined in underlyingToken.
     * @param quote The quantity of the strike asset. Also the quote of underlyingToken denominated in strikeToken.
     * @param expiry The expirate date (strike date) of the  option as a UNIX timestamp.
     * @return premium The sum of the 'time value' and 'intrinsic' value of the  option.
     * Returns a premium that is denominated in underlyingToken.
     */
    function calculatePremium(
        address underlyingToken,
        address strikeToken,
        uint256 volatility,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) public override view returns (uint256 premium) {
        // Calculate the parts.
        uint256 intrinsic = calculateIntrinsic(
            underlyingToken,
            strikeToken,
            base,
            quote
        );
        uint256 extrinsic = calculateExtrinsic(
            underlyingToken,
            volatility,
            base,
            quote,
            expiry
        );

        // Sum the parts.
        premium = (extrinsic.add(intrinsic));

        // If the premium is 0, return a minimum value.
        premium = premium > MIN_PREMIUM ? premium : MIN_PREMIUM;
    }

    /**
     * @dev Gets the market quote Ether.
     */
    function marketPrice() public override view returns (uint256 market) {
        market = uint256(IAggregator(oracle).latestAnswer());
    }

    /**
     * @dev Calculates the intrinsic value of a  option using compound's quote oracle.
     * @param underlyingToken The address of the underlying asset.
     * @param strikeToken The address of the strike asset.
     * @param base The quantity of the underlying asset. Also the quote of underlyingToken denomined in underlyingToken.
     * @param quote The quantity of the strike asset. Also the quote of underlyingToken denominated in strikeToken.
     * @return intrinsic The difference between the quote of underlyingToken denominated in S between the
     * strike quote (quote) and market quote (market).
     */
    function calculateIntrinsic(
        address underlyingToken,
        address strikeToken,
        uint256 base,
        uint256 quote
    ) public override view returns (uint256 intrinsic) {
        // Currently only supports WETH options with an assumed stablecoin strike.
        require(
            underlyingToken == weth || strikeToken == weth,
            "ERR_ONLY_WETH_SUPPORT"
        );
        // Get the oracle market quote of ether.
        // If the underlying is WETH, the option is a call. Intrinsic = (S - K).
        // Else if the strike is WETH, the option is a put. Intrinsic = (K - S).
        uint256 market = marketPrice();
        if (underlyingToken == weth) {
            intrinsic = market > quote ? market.sub(quote) : uint256(0);
        } else intrinsic = base > market ? base.sub(market) : uint256(0);
    }

    /**
     * @dev Calculates the extrinsic value of the  option using Primitive's pricing model.
     * @notice Strike / Market * (Volatility(%) * 1000) * sqrt(T in seconds left) / Seconds in a Day.
     * @param underlyingToken The address of the underlying asset.
     * @param volatility The arbritary volatility as a percentage scaled by 1000.
     * @param base The quantity of the underlying asset. Also the quote of underlyingToken denomined in underlyingToken.
     * @param quote The quantity of the strike asset. Also the quote of underlyingToken denominated in strikeToken.
     * @param expiry The expirate date (strike date) of the  option as a UNIX timestamp.
     * @return extrinsic The 'time value' of the  option based on Primitive's pricing model.
     */
    function calculateExtrinsic(
        address underlyingToken,
        uint256 volatility,
        uint256 base,
        uint256 quote,
        uint256 expiry
    ) public override view returns (uint256 extrinsic) {
        // Get the oracle market quote of ether.
        uint256 market = marketPrice();
        // Time left in seconds.
        uint256 timeRemainder = (expiry.sub(block.timestamp));
        // Strike quote is the quote of underlyingToken denominated in strikeToken.
        uint256 strike = underlyingToken == weth
            ? quote.mul(ONE_ETHER).div(base)
            : base.mul(ONE_ETHER).div(quote);
        // Strike / Market scaled to 1e18. Denominated in ethers.
        uint256 moneyness = market.mul(ONE_ETHER).div(strike);
        // Extrinsic value denominted in underlyingToken.
        (extrinsic) = _extrinsic(moneyness, volatility, timeRemainder);
    }

    function _extrinsic(
        uint256 moneyness,
        uint256 volatility,
        uint256 timeRemainder
    ) public pure returns (uint256 extrinsic) {
        extrinsic = moneyness
            .mul(ONE_ETHER)
            .mul(volatility)
            .mul(sqrt(timeRemainder))
            .div(ONE_ETHER)
            .div(SECONDS_IN_DAY);
    }

    /**
     * @dev Utility function to calculate the square root of an integer. Used in calculating premium.
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            uint256 x = (y + 1) / 2;
            z = y;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
