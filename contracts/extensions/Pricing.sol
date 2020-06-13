pragma solidity >0.5.7 <=0.6.2 ;

import "../library/ABDKMath64x64.sol";

contract Pricing {
    using ABDKMath64x64 for int128;
    

    constructor () public {}


    /**
     * @dev Calculate the ATM option price. 0.4 * S * sigma * sqrt(T-t).
     */
    function calculateATM(uint s, uint k, uint o, uint t) public pure returns (uint atm) {
        atm = ABDKMath64x64.toUInt(
            int128(2)
            .div(int128(5))
            .mul(ABDKMath64x64.fromUInt(s))
            .mul(ABDKMath64x64.fromUInt(o)).div(ABDKMath64x64.fromUInt(100))
            .mul(ABDKMath64x64.sqrt(ABDKMath64x64.fromUInt(t)))
        );
    }

    /**
     * @dev Calculate the d1 auxiliary variable.
     * @notice ( ln(s/k) + (o^2/2)*T ) / o * sqrt(T)
     */
    function d1(uint s, uint k, uint o, uint t) public pure returns (uint d) {
        int128 moneyness = ABDKMath64x64.ln(ABDKMath64x64.fromUInt(s).div(ABDKMath64x64.fromUInt(k)));
        int128 vol = (ABDKMath64x64.fromUInt(o).div(ABDKMath64x64.fromUInt(100))).pow(2)
                    .div(ABDKMath64x64.fromUInt(2));
        int128 num = moneyness.add(vol);
        int128 dom = ABDKMath64x64.fromUInt(o)
                    .div(ABDKMath64x64.fromUInt(100))
                    .mul(ABDKMath64x64.sqrt(ABDKMath64x64.fromUInt(t)));
        d = ABDKMath64x64.toUInt(num.div(dom).mul(ABDKMath64x64.fromUInt(1000)));
        /* d = ABDKMath64x64.toUInt((
                ABDKMath64x64.ln(
                    ABDKMath64x64.fromUInt(s)
                    .div(ABDKMath64x64.fromUInt(k)))
                .add(
                    (ABDKMath64x64.fromUInt(o).div(ABDKMath64x64.fromUInt(100))).pow(2)
                    .div(ABDKMath64x64.fromUInt(2))
                    )
                .mul(ABDKMath64x64.fromUInt(t)))
                .div(
                    ABDKMath64x64.fromUInt(o)
                    .div(ABDKMath64x64.fromUInt(100))
                    .mul(ABDKMath64x64.sqrt(ABDKMath64x64.fromUInt(t)))
                    )
                .mul(ABDKMath64x64.fromUInt(1000))
                ); */
                
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
                        .div(ABDKMath64x64.fromUInt(1000)))
                        .mul(ABDKMath64x64.fromUInt(1000)));
    }

    /**
     * @dev Calculate the extrinsic price.
     * @param x The multiplier number is the standardized moneyness. LN(S/K) / sigma * sqrt(T-t).
     * @param atm The price of the ATM option. 0.4 * S * sigma * sqrt(T-t).
     * @return p The extrinsic price of a call option.
     */
    function price(uint x, uint atm) public pure returns (uint p) {
        uint m = magic(x);
        p = ABDKMath64x64.toUInt(ABDKMath64x64.fromUInt(m).mul(ABDKMath64x64.fromUInt(atm)));
    }
}