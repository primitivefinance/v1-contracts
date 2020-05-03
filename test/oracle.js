const { expect } = require("chai");
const PrimeOracle = artifacts.require("PrimeOracle");

contract("Oracle contract", accounts => {
    // WEB3
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const { getBalance } = web3.eth;

    // ERROR CODES
    const ERR_ZERO = "ERR_ZERO";
    const ERR_BAL_ETH = "ERR_BAL_ETH";
    const ERR_NOT_OWNER = "ERR_NOT_OWNER";
    const ERR_BAL_PRIME = "ERR_BAL_PRIME";
    const ERR_BAL_STRIKE = "ERR_BAL_STRIKE";
    const ERR_BAL_REDEEM = "ERR_BAL_REDEEM";
    const ERR_BAL_TOKENS = "ERR_BAL_TOKENS";
    const ERR_BAL_OPTIONS = "ERR_BAL_OPTIONS";
    const ERR_OPTION_TYPE = "ERR_OPTION_TYPE";

    // COMMON AMOUNTS
    const ROUNDING_ERR = 10**8;
    const ONE_ETHER = toWei('1');
    const TWO_ETHER = toWei('2');
    const FIVE_ETHER = toWei('5');
    const TEN_ETHER = toWei('10');
    const FIFTY_ETHER = toWei('50');
    const HUNDRED_ETHER = toWei('100');
    const THOUSAND_ETHER = toWei('1000');
    const MILLION_ETHER = toWei('1000000');

    // CORE ADDRESSES
    const MAINNET_DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const MAINNET_ORACLE = '0xdA17fbEdA95222f331Cb1D252401F4b44F49f7A0';
    const MAINNET_COMPOUND_DAI = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643';

    // ACCOUNTS
    const Alice = accounts[0]
    const Bob = accounts[1]

    let oracle;

    before(async () => {
        oracle = await PrimeOracle.new(MAINNET_ORACLE);
    });

    describe("Deployment", () => {
        it("Should deploy with the correct address and MCD_DAI Feed", async () => {
            expect(await oracle.oracle()).to.be.equal(MAINNET_ORACLE);
            expect(await oracle.feeds(MAINNET_DAI)).to.be.equal(MAINNET_COMPOUND_DAI);
        });
    });

    describe("Calculation", () => {
        it("Calculates the premium for ETH 200 DAI Put Expiring May 29", async () => {
            let deribit = '0.0765'; // in ethers
            let tokenU = MAINNET_DAI;
            let volatility = 880; // Deribit's IV is 88% as of today May 3, 2020.
            let base = toWei('200');
            let price = toWei('1');
            let expiry = '1590796740'; // May 29 at 11:59 PM.
            let premium = await oracle.calculatePremium(tokenU, volatility, base, price, expiry);
            console.log('[PREMIUM IN WEI]', (premium).toString());
            console.log('[PREMIUM]', fromWei(premium));
            console.log('[DERIBIT PREMIUM]', deribit);
        });
    });
});