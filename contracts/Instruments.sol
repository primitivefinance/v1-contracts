pragma solidity ^0.6.2;

/** 
 *  @title Primitive's Instruments
 * @author Primitive Finance
 */


library Instruments {
     /** 
     * @dev A Prime has these properties.
     * @param writer `msg.sender` of the createPrime function.
     * @param qUnderlying Quantity of collateral asset token.
     * @param aUnderlying Address of collateral asset token.
     * @param qStrike Purchase price of collateral, denominated in quantity of token z.
     * @param aStrike Address of purchase price asset token.
     * @param tExpiry UNIX timestamp of valid time period.
     * @param receiver Address of payment receiver of token z.
     * @param series Keccak256 hash of (aUnderlying ^ aStrike ^ tExpiry)
     * @param symbol Keccak256 hash of all params excluding series
     */
    struct Primes {
        address writer;
        uint256 qUnderlying;
        address aUnderlying;
        uint256 qStrike;
        address aStrike;
        uint256 tExpiry;
        address receiver;
        bytes4 series;
        bytes4 symbol;
    }
}