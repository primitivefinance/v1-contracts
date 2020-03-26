pragma solidity ^0.6.0;

/** 
 *  @title Primitive's Instruments
 * @author Primitive Finance
 */


library Instruments {
     /** 
     * @dev A Prime has these properties.
     * @param ace `msg.sender` of the createPrime function.
     * @param xis Quantity of collateral asset token.
     * @param yak Address of collateral asset token.
     * @param zed Purchase price of collateral, denominated in quantity of token z.
     * @param wax Address of purchase price asset token.
     * @param pow UNIX timestamp of valid time period.
     * @param gem Address of payment receiver of token z.
     */
    struct Primes {
        address ace;
        uint256 xis;
        address yak;
        uint256 zed;
        address wax;
        uint256 pow;
        address gem;
        bytes4 chain;
        bytes4 fullChain;
    }
}