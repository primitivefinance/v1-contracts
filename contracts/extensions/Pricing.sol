pragma solidity >0.5.7 <=0.6.2 ;

import "../library/ABDKMath64x64.sol";

contract Pricing {
    using ABDKMath64x64 for *;

    uint public constant YEAR = 31449600;
    uint public constant MANTISSA = 10 ** 8;
    uint public constant DENOMINATOR = 10 ** 18;
    uint public constant PERCENTAGE = 10 ** 3;
    

    constructor () public {}


    /**
     * @dev Calculate the ATM option price. 0.4 * S * sigma * sqrt(T-t).
     * @param s Spot price of underlying token in USD/DAI/USDC.
     * @param o "volatility" scaled by 1000.
     * @param t Time until expiration in seconds.
     */
    function calculateATM(uint s, uint o, uint t) public pure returns (uint atm) {
        int128 spot = s.divu(DENOMINATOR);
        atm = ABDKMath64x64.toUInt(
            int128(2)
            .div(int128(5))
            .mul(spot)
            .mul(ABDKMath64x64.fromUInt(o)).div(ABDKMath64x64.fromUInt(PERCENTAGE))
            .mul(ABDKMath64x64.sqrt(ABDKMath64x64.fromUInt(t).div(ABDKMath64x64.fromUInt(YEAR))))
        );
    }

    /**
     * @dev Calculate the d1 auxiliary variable.
     * @notice ( ln(s/k) + (o^2/2)*T ) / o * sqrt(T).
     * @param s Spot price of underlying token in USD/DAI/USDC.
     * @param k Strike price in USD/DAI/USDC.
     * @param o "volatility" scaled by 1000.
     * @param t Time until expiration in seconds.
     */
    function auxiliary(uint s, uint k, uint o, uint t) public pure returns (int128 d1) {
        int128 spot = s.divu(DENOMINATOR);
        int128 strike = k.divu(DENOMINATOR);
        int128 moneyness = ABDKMath64x64.ln(spot.div(strike));
        int128 vol = (ABDKMath64x64.fromUInt(o).div(ABDKMath64x64.fromUInt(PERCENTAGE))).pow(2)
                    .div(ABDKMath64x64.fromUInt(2));
        int128 num = moneyness.add(vol);
        int128 dom = ABDKMath64x64.fromUInt(o)
                    .div(ABDKMath64x64.fromUInt(PERCENTAGE))
                    .mul(ABDKMath64x64.sqrt(ABDKMath64x64.fromUInt(t).div(ABDKMath64x64.fromUInt(YEAR))));
        d1 = num.div(dom);    
    }

    /**
     * @dev Calculate the d1 auxiliary variable.
     * @notice ( ln(s/k) + (o^2/2)*T ) / o * sqrt(T).
     * @param s Spot price of underlying token in USD/DAI/USDC.
     * @param k Strike price in USD/DAI/USDC.
     * @param o "volatility" scaled by 1000.
     * @param t Time until expiration in seconds.
     */
    function auxiliary2(uint s, uint k, uint o, uint t) public pure returns (int128 d2) {
        int128 d1 = auxiliary(s, k, o, t);
        d2 = d1.sub(
                    ABDKMath64x64.fromUInt(o)
                    .div(ABDKMath64x64.fromUInt(PERCENTAGE))
                    .mul(ABDKMath64x64.sqrt(ABDKMath64x64.fromUInt(t).div(ABDKMath64x64.fromUInt(YEAR))))
                    );
                
    }

    function ndnumerator(int128 z) public pure returns (int128 numerator) {
        numerator = ABDKMath64x64.exp(
                            int128(-1).mul(
                            (z).pow(2)
                            .div(int128(2))
                            ));
    }

    function nddenominator(int128 z) public pure returns (int128 denominator) {
        z = z.div(ABDKMath64x64.fromUInt(MANTISSA));
        int128 a = int128(44).div(int128(79));
        int128 b = int128(8).div(int128(5)).mul(z);
        int128 c = (z.pow(2)).add(int128(3));
        int128 d = ABDKMath64x64.sqrt(c);
        int128 e = int128(5).div(int128(6)).mul(d);
        denominator = a.add(b).add(e);
    }

    function normdist(int128 z) public pure returns (int128 n) {
        int128 numerator = ABDKMath64x64.exp(
                            int128(-1).mul(
                            (z).pow(2)
                            .div(int128(2))
                            ));
        int128 denominator = (int128(44).div(int128(79)))
                        .add(int128(8).div(int128(5)).mul(z))
                        .add(int128(5).div(int128(6)).mul(
                            ABDKMath64x64.sqrt(
                                (z).pow(2).add(int128(3))
                                )
                            )
                        );

        n = ABDKMath64x64.fromUInt(MANTISSA).sub(numerator.mul(ABDKMath64x64.fromUInt(MANTISSA)).div(denominator));
    }

    function square(uint x) public pure returns (uint sq) {
        sq = ABDKMath64x64.toUInt(ABDKMath64x64.fromUInt(x).pow(2));
    }

    function bs(uint s, uint k, uint o, uint t) public pure returns (int128 p) {
        int128 spot = s.divu(DENOMINATOR);
        int128 strike = k.divu(DENOMINATOR);
        int128 d1 = auxiliary(s, k, o, t);
        int128 d2 = auxiliary2(s, k, o, t);
        int128 nd1 = normdist(d1);
        int128 nd2 = normdist(d2);
        int128 bs = spot.mul(nd1) > strike.mul(nd2) ? spot.mul(nd1).sub(strike.mul(nd2)) : int128(0);
        //p = ABDKMath64x64.toUInt(bs.mul(ABDKMath64x64.fromUInt(MANTISSA)));
        p = bs;
    }

    function _fromInt(int128 x) public pure returns (uint y) {
        x = x.mul(ABDKMath64x64.fromUInt(MANTISSA));
        y = x > 0 ? ABDKMath64x64.toUInt(x) : uint(0);
    }

    function to128(int128 x) public pure returns (int256 y) {
        y = ABDKMath64x64.to128x128(x);
    }

    /**
     * @dev Calculate the M factory. e^(-1.4x).
     * @param x The multiplier number is the standardized moneyness.
     */
    function magic(uint x) public pure returns (uint m) {
        m = ABDKMath64x64.toUInt(
                ABDKMath64x64.exp(
                        int128(-7)
                        .div(int128(5))
                        .mul(ABDKMath64x64.fromUInt(x))
                        .div(ABDKMath64x64.fromUInt(MANTISSA)))
                        .mul(ABDKMath64x64.fromUInt(MANTISSA)));
    }

    /**
     * @dev Calculate the extrinsic price.
     * @param s Spot price of underlying token in USD/DAI/USDC.
     * @param k Strike price in USD/DAI/USDC.
     * @param o "volatility" scaled by 1000.
     * @param t Time until expiration in seconds.
     * @return p The extrinsic price of a call option.
     */
    function extrinsic(uint s, uint k, uint o, uint t) public pure returns (uint p) {
        uint a = calculateATM(s, o, t);
        uint x = ABDKMath64x64.toUInt(auxiliary(s, k, o, t).mul(ABDKMath64x64.fromUInt(MANTISSA))); 
        uint m = magic(x);
        p = ABDKMath64x64.toUInt(ABDKMath64x64.fromUInt(m).mul(ABDKMath64x64.fromUInt(a)));
        p = p * 10 ** 10;
    }
}