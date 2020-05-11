pragma solidity ^0.6.2;

/**
 * @title   Oracle for Calculating The Prices of Prime Options
 * @author  Primitive
 */

import "@openzeppelin/contracts/math/SafeMath.sol";

interface PriceOracleProxy {
    function getUnderlyingPrice(address cToken) external view returns (uint);
}

contract PrimeOracle {
    using SafeMath for uint256;

    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant MCD_DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant COMPOUND_DAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    address public constant COMPOUND_ETH = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
    address public constant COMPOUND_USDC = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
    address public constant COMPOUND_USDT = 0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9;
    address public constant COMPOUND_WBTC = 0xC11b1268C1A384e55C48c2391d8d480264A3A7F4;
    address public oracle;

    uint256 public constant MIN_PREMIUM = 10**3;
    uint256 public constant ONE_ETHER = 1 ether;
    uint256 public constant SECONDS_IN_DAY = 86400;

    mapping(address => address) public feeds;

    constructor(address _oracle) public {
        oracle = _oracle;
        feeds[MCD_DAI] = COMPOUND_DAI;
    }

    /**
     * @dev Testing function to add non-mainnet oracle feeds.
     */
    function addFeed(address feed) public {
        feeds[feed] = feed;
    }

    /**
     * @dev Calculates the intrinsic + extrinsic value of the Prime option.
     * @notice Strike / Market * (Volatility * 1000) * sqrt(T in seconds remaining) / Seconds in a Day.
     * @param tokenU The address of the underlying asset.
     * @param volatility The arbritary volatility as a percentage scaled by 1000.
     * @param base The quantity of the underlying asset. Also the price of tokenU denomined in tokenU.
     * @param price The quantity of the strike asset. Also the price of tokenU denominated in tokenS.
     * @param expiry The expirate date (strike date) of the Prime option as a UNIX timestamp.
     * @return premium The sum of the 'time value' and 'intrinsic' value of the Prime option.
     * Returns a premium that is denominated in tokenU.
     */
    function calculatePremium(
        address tokenU,
        uint256 volatility,
        uint256 base,
        uint256 price,
        uint256 expiry
    )
        public
        view
        returns (uint256 premium)
    {
        // Calculate the parts.
        (uint256 intrinsic) = calculateIntrinsic(tokenU, base, price);
        (uint256 extrinsic) = calculateExtrinsic(tokenU, volatility, base, price, expiry);
        
        // Sum the parts.
        premium = (extrinsic.add(intrinsic));

        // If the premium is 0, return a minimum value.
        premium = premium > 0 ? premium : MIN_PREMIUM;
    }

    /**
     * @dev Gets the market price of tokenU using compound's oracle, which uses the compound
     * version of the token.
     */
    function marketPrice(address tokenU) public view returns (uint256 market) {
        // The compound wrapped tokenU. e.g. tokenU = DAI, feed = cDAI.
        address feed = feeds[tokenU];
        require(feed != address(0), "ERR_FEED_INVALID");
        // Returns the price of tokenU denominated in ethers.
        market = PriceOracleProxy(oracle).getUnderlyingPrice(feed);
    }

    /**
     * @dev Calculates the intrinsic value of a Prime option using compound's price oracle.
     * @param tokenU The address of the underlying asset.
     * @param base The quantity of the underlying asset. Also the price of tokenU denomined in tokenU.
     * @param price The quantity of the strike asset. Also the price of tokenU denominated in tokenS.
     * @return intrinsic The difference between the price of tokenU denominated in S between the
     * strike price (price) and market price (market).
     */
    function calculateIntrinsic(address tokenU, uint256 base, uint256 price)
        public
        view
        returns (uint256 intrinsic)
    {
        (uint256 market) = marketPrice(tokenU);
        // Strike price of tokenU per ETH. ETH / tokenU = price of tokenU per eth, scaled to 10^18 units.
        uint256 strike = price.mul(ONE_ETHER).div(base);
        // Difference = Base * market price / strike price.
        uint256 difference = base.mul(market).div(strike);
        // Intrinsic value denominated in tokenU.
        intrinsic = difference >= base ? difference.sub(base) : 0;
    }

    /**
     * @dev Calculates the extrinsic value of the Prime option using Primitive's pricing model.
     * @notice Strike / Market * (Volatility(%) * 1000) * sqrt(T in seconds left) / Seconds in a Day.
     * @param tokenU The address of the underlying asset.
     * @param volatility The arbritary volatility as a percentage scaled by 1000.
     * @param base The quantity of the underlying asset. Also the price of tokenU denomined in tokenU.
     * @param price The quantity of the strike asset. Also the price of tokenU denominated in tokenS.
     * @param expiry The expirate date (strike date) of the Prime option as a UNIX timestamp.
     * @return extrinsic The 'time value' of the Prime option based on Primitive's pricing model.
     */
    function calculateExtrinsic(
        address tokenU,
        uint256 volatility,
        uint256 base,
        uint256 price,
        uint256 expiry
    )
        public
        view
        returns (uint256 extrinsic)
    {
        // Market price of tokenU denominated in ethers.
        (uint256 market) = marketPrice(tokenU);
        // Time left in seconds.
        uint256 timeRemainder = (expiry.sub(block.timestamp));
        // Strike price is the price of tokenU denominated in tokenS.
        uint256 strike = price.mul(ONE_ETHER).div(base);
        // Strike / Market scaled to 1e18. Denominated in ethers.
        uint256 moneyness = strike.mul(ONE_ETHER).div(market);
        // Extrinsic value denominted in tokenU.
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
    function sqrt(uint256 y) private pure returns (uint256 z) {
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