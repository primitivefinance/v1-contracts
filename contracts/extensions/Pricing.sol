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
        d1 = num.div(dom).mul(ABDKMath64x64.fromUInt(MANTISSA));    
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

    function normdist(uint z) public pure returns (uint n) {
        int128 numerator = ABDKMath64x64.exp(
                            int128(1).mul(
                            (ABDKMath64x64.fromUInt(z).div(ABDKMath64x64.fromUInt(PERCENTAGE))).pow(2)
                            .div(ABDKMath64x64.fromUInt(2))
                            ));
        int128 denominator = (int128(44).div(int128(79)))
                        .add(int128(8).div(int128(5)).mul(ABDKMath64x64.fromUInt(z).div(ABDKMath64x64.fromUInt(PERCENTAGE))))
                        .add(int128(5).div(int128(6)).mul(
                            ABDKMath64x64.sqrt(
                                (ABDKMath64x64.fromUInt(z).div(ABDKMath64x64.fromUInt(PERCENTAGE))).pow(2).add(int128(3))
                                )
                            )
                        );

        n = ABDKMath64x64.toUInt(
            ABDKMath64x64.fromUInt(1)
                .sub(
                    (
                        numerator
                    )
                    .div(
                        denominator
                    )
                )
            .mul(ABDKMath64x64.fromUInt(MANTISSA)));
        /* n = ABDKMath64x64.toUInt(
            ABDKMath64x64.fromUInt(1)
                .sub(
                    (
                        ABDKMath64x64.exp(
                            (ABDKMath64x64.fromUInt(z).div(ABDKMath64x64.fromUInt(PERCENTAGE))).pow(2)
                            .div(ABDKMath64x64.fromUInt(2))
                            .mul(int128(-1))
                        )
                    )
                    .div(
                        (int128(44).div(int128(79)))
                        .add(int128(8).div(int128(5)).mul(ABDKMath64x64.fromUInt(z).div(ABDKMath64x64.fromUInt(PERCENTAGE))))
                        .add(int128(5).div(int128(6)).mul(
                            ABDKMath64x64.sqrt(
                                (ABDKMath64x64.fromUInt(z).div(ABDKMath64x64.fromUInt(PERCENTAGE))).pow(2).add(int128(3))
                                )
                            )
                        )
                    )
                )
            .mul(ABDKMath64x64.fromUInt(MANTISSA))
        ); */
    }

    function bs(uint s, uint k, uint o, uint t) public pure returns (uint p) {
        int128 spot = s.divu(DENOMINATOR);
        int128 strike = k.divu(DENOMINATOR);
        int128 d1 = auxiliary(s, k, o, t);
        int128 d2 = auxiliary2(s, k, o, t);
        int128 nd1 = ABDKMath64x64.fromUInt(normdist(ABDKMath64x64.toUInt(d1)));
        int128 nd2 = ABDKMath64x64.fromUInt(normdist(ABDKMath64x64.toUInt(d2)));
        p = ABDKMath64x64.toUInt(spot.mul(nd1).sub(strike.mul(nd2)));
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
        uint x = ABDKMath64x64.toUInt(auxiliary(s, k, o, t)); 
        uint m = magic(x);
        p = ABDKMath64x64.toUInt(ABDKMath64x64.fromUInt(m).mul(ABDKMath64x64.fromUInt(a)));
        p = p * 10 ** 10;
    }
}