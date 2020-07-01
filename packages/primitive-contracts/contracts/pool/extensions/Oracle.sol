pragma solidity ^0.6.2;

/**
 * @title   Oracle for Calculating The Prices of  Options
 * @author  Primitive
 */

import "../interfaces/IAggregator.sol";
import "../interfaces/IOracle.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Oracle is IOracle {
    using SafeMath for uint;

    address public oracle;
    address public weth;

    uint public constant MANTISSA = 10**36;
    uint public constant ONE_ETHER = 1 ether;
    uint public constant MIN_PREMIUM = 10**3;
    uint public constant SECONDS_IN_DAY = 86400;

    constructor(address _oracle, address _weth) public {
        oracle = _oracle;
        weth = _weth;
    }

    /**
     * @dev Calculates the intrinsic + extrinsic value of the  option.
     * @notice Strike / Market * (Volatility * 1000) * sqrt(T in seconds remaining) / Seconds in a Day.
     * @param tokenU The address of the underlying asset.
     * @param tokenS The address of the strike asset.
     * @param volatility The arbritary volatility as a percentage scaled by 1000.
     * @param base The quantity of the underlying asset. Also the quote of tokenU denomined in tokenU.
     * @param quote The quantity of the strike asset. Also the quote of tokenU denominated in tokenS.
     * @param expiry The expirate date (strike date) of the  option as a UNIX timestamp.
     * @return premium The sum of the 'time value' and 'intrinsic' value of the  option.
     * Returns a premium that is denominated in tokenU.
     */
    function calculatePremium(
        address tokenU,
        address tokenS,
        uint volatility,
        uint base,
        uint quote,
        uint expiry
    )
        public
        view
        override
        returns (uint premium)
    {
        // Calculate the parts.
        (uint intrinsic) = calculateIntrinsic(tokenU, tokenS, base, quote);
        (uint extrinsic) = calculateExtrinsic(tokenU, tokenS, volatility, base, quote, expiry);
        
        // Sum the parts.
        premium = (extrinsic.add(intrinsic));

        // If the premium is 0, return a minimum value.
        premium = premium > MIN_PREMIUM ? premium : MIN_PREMIUM;
    }

    /**
     * @dev Gets the market quote Ether.
     */
    function marketPrice() public view override returns (uint market) {
        market = uint(IAggregator(oracle).latestAnswer());
    }

    /**
     * @dev Calculates the intrinsic value of a  option using compound's quote oracle.
     * @param tokenU The address of the underlying asset.
     * @param tokenS The address of the strike asset.
     * @param base The quantity of the underlying asset. Also the quote of tokenU denomined in tokenU.
     * @param quote The quantity of the strike asset. Also the quote of tokenU denominated in tokenS.
     * @return intrinsic The difference between the quote of tokenU denominated in S between the
     * strike quote (quote) and market quote (market).
     */
    function calculateIntrinsic(address tokenU, address tokenS, uint base, uint quote)
        public
        view
        override
        returns (uint intrinsic)
    {
        // Currently only supports WETH options with an assumed stablecoin strike.
        require(tokenU == weth || tokenS == weth, "ERR_ONLY_WETH_SUPPORT");
        // Get the oracle market quote of ether.
        // If the underlying is WETH, the option is a call. Intrinsic = (S - K).
        // Else if the strike is WETH, the option is a put. Intrinsic = (K - S).
        (uint market) = marketPrice();
        if(tokenU == weth) { intrinsic = market > quote ? market.sub(quote) : uint(0); }
        else intrinsic = base > market ? base.sub(market) : uint(0);
    }

    /**
     * @dev Calculates the extrinsic value of the  option using Primitive's pricing model.
     * @notice Strike / Market * (Volatility(%) * 1000) * sqrt(T in seconds left) / Seconds in a Day.
     * @param tokenU The address of the underlying asset.
     * @param tokenS The address of the strike asset.
     * @param volatility The arbritary volatility as a percentage scaled by 1000.
     * @param base The quantity of the underlying asset. Also the quote of tokenU denomined in tokenU.
     * @param quote The quantity of the strike asset. Also the quote of tokenU denominated in tokenS.
     * @param expiry The expirate date (strike date) of the  option as a UNIX timestamp.
     * @return extrinsic The 'time value' of the  option based on Primitive's pricing model.
     */
    function calculateExtrinsic(
        address tokenU,
        address tokenS,
        uint volatility,
        uint base,
        uint quote,
        uint expiry
    )
        public
        view
        override
        returns (uint extrinsic)
    {
        // Get the oracle market quote of ether.
        (uint market) = marketPrice();
        // Time left in seconds.
        uint timeRemainder = (expiry.sub(block.timestamp));
        // Strike quote is the quote of tokenU denominated in tokenS.
        uint strike = tokenU == weth ? 
            quote.mul(ONE_ETHER).div(base) :
            base.mul(ONE_ETHER).div(quote);
        // Strike / Market scaled to 1e18. Denominated in ethers.
        uint moneyness = market.mul(ONE_ETHER).div(strike);
        // Extrinsic value denominted in tokenU.
        (extrinsic) = _extrinsic(moneyness, volatility, timeRemainder);
    }

    function _extrinsic(uint moneyness, uint volatility, uint timeRemainder)
        public
        pure
        returns (uint extrinsic)
    {
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
    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            uint x = (y + 1) / 2;
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