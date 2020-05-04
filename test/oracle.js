const { assert, expect } = require("chai");
const { BigNumber } = require("bignumber.js");
const PrimeOracle = artifacts.require("PrimeOracle");

contract("Oracle contract", accounts => {
    // WEB3
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;

    // CORE ADDRESSES
    const MAINNET_DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const MAINNET_ORACLE = '0xdA17fbEdA95222f331Cb1D252401F4b44F49f7A0';
    const MAINNET_COMPOUND_DAI = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643';


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

    describe("Calculation General", () => {
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

        it("Calculates premiums for arbritary options", async () => {

            const calculatePremiums = async (volatility, base, price, expiry) => {
                let tokenU = MAINNET_DAI;
                let premium = await oracle.calculatePremium(tokenU, volatility, base, price, expiry);
                return premium;
            }

            const generateRandomOption = () => {
                let ethPrice = 200;
                function randomDate(start, end) {
                    let date = Math.floor(+start + Math.random() * (end - start));
                    return date;
                }
                function getRandomArbitrary(min, max) {
                    return Math.random() * (max - min) + min;
                }
                let option = {
                    volatility: Math.floor(1000 * Math.random()),
                    base: toWei((ethPrice * getRandomArbitrary(0.9, 1.1)).toString()),
                    price: toWei('1'),
                    expiry: randomDate(1588636800, 1590796740)
                }

                return option;
            }

            const run = async (amount) => {
                for(let i = 0; i < amount; i++) {
                    let option = generateRandomOption();
                    let premium = await calculatePremiums(
                        option.volatility,
                        option.base,
                        option.price,
                        option.expiry
                    );

                    let calculation = {
                        volatility: option.volatility,
                        base: fromWei(option.base),
                        price: fromWei(option.price),
                        expiry: (new Date(option.expiry * 1000)).toDateString(),
                        premium: fromWei(premium)
                    }
                    console.log(calculation);
                }
            }
            
            await run(1);
        });
    });

    describe("Calculation Intrinsic", () => {

        it("Calculates intrinsic premiums for arbritary options and compares to market", async () => {

            const calculateIntrinsic = async (base, price) => {
                let tokenU = MAINNET_DAI;
                let intrinsic = await oracle.calculateIntrinsic(tokenU, base, price);
                return intrinsic;
            }

            const generateRandomOption = () => {
                let ethPrice = 200;
                function randomDate(start, end) {
                    let date = Math.floor(+start + Math.random() * (end - start));
                    return date;
                }
                function getRandomArbitrary(min, max) {
                    return Math.random() * (max - min) + min;
                }
                let option = {
                    volatility: Math.floor(1000 * Math.random()),
                    base: toWei((ethPrice * getRandomArbitrary(0.9, 1.1)).toString()),
                    price: toWei('1'),
                    expiry: randomDate(1588636800, 1590796740)
                }

                return option;
            }

            const run = async (amount) => {
                for(let i = 0; i < amount; i++) {
                    let option = generateRandomOption();
                    let intrinsic = await calculateIntrinsic(
                        option.base,
                        option.price
                    );
                    let market = new BigNumber(await oracle.marketPrice(MAINNET_DAI));
                    market = new BigNumber(10**36)
                                    .dividedBy(market);
                    // For puts
                    let expected = 
                                new BigNumber(option.base)
                                    .minus(market);
                    let difference;
                    if(intrinsic >= expected) {
                        difference = new BigNumber(intrinsic).minus(expected);
                    } else {
                        difference = 0;
                    };

                    let error = difference.dividedBy(new BigNumber(option.base)).multipliedBy(100);

                    let calculation = {
                        market: (market).toString(),
                        base: option.base,
                        price: option.price,
                        intrinsic: (intrinsic).toString(),
                        expected: (expected).toString(),
                        difference: fromWei((Math.floor(difference)).toString()),
                        error: (error).toString()
                    }
                    console.log(calculation);
                    let max_error = 1.5; // %
                    if(+intrinsic > 0) {
                        assert.isAtMost(+error, +max_error);
                    }
                }
            }
            
            await run(10);
        });
    });

    describe("Calculation Extrinsic", () => {

        it("Calculates extrinsic premiums for arbritary options parameters", async () => {
            const calculateExtrinsic = async (volatility, base, price, expiry) => {
                let tokenU = MAINNET_DAI;
                let extrinsic = await oracle.calculateExtrinsic(tokenU, volatility, base, price, expiry);
                return extrinsic;
            }

            const generateRandomOption = () => {
                let ethPrice = 200;
                function randomDate(start, end) {
                    let date = Math.floor(+start + Math.random() * (end - start));
                    return date;
                }
                function getRandomArbitrary(min, max) {
                    return Math.random() * (max - min) + min;
                }
                let option = {
                    volatility: Math.floor(1000 * Math.random()),
                    base: toWei((ethPrice * getRandomArbitrary(0.9, 1.1)).toString()),
                    price: toWei('1'),
                    expiry: randomDate(1588636800, 1590796740)
                }

                return option;
            }

            const run = async (amount) => {
                for(let i = 0; i < amount; i++) {
                    let option = generateRandomOption();
                    let extrinsic = await calculateExtrinsic(
                        option.volatility,
                        option.base,
                        option.price,
                        option.expiry
                    );

                    let calculation = {
                        volatility: option.volatility,
                        base: fromWei(option.base),
                        price: fromWei(option.price),
                        expiry: (new Date(option.expiry * 1000)).toDateString(),
                        extrinsic: fromWei(extrinsic)
                    }
                    console.log(calculation);
                }
            }
            
            await run(3);
        });
    });

    describe("Calculation Specific", () => {

        it("Calculates extrinsic premiums for arbritary options parameters", async () => {
            const calculateExtrinsic = async (volatility, base, price, expiry) => {
                let tokenU = MAINNET_DAI;
                let extrinsic = await oracle.calculateExtrinsic(tokenU, volatility, base, price, expiry);
                return extrinsic;
            }
            
            let extrinsic = await calculateExtrinsic(
                829,
                toWei('200'),
                toWei('1'),
                '1589543940' // May 15 11:59 pm
            );

            let calculation = {
                volatility: 829,
                base: '200',
                price: '1',
                expiry: (new Date(1589543940 * 1000)).toDateString(),
                extrinsic: fromWei(extrinsic)
            }
            console.log(calculation);

            const run = async (amount) => {
                let volatility = 640;
                for(let i = 0; i < amount; i++) {
                    
                    let extrinsic = await calculateExtrinsic(
                        volatility,
                        toWei('200'),
                        toWei('1'),
                        '1589543940' // May 15 11:59 pm
                    );

                    let calculation = {
                        volatility: volatility,
                        base: '200',
                        price: '1',
                        expiry: (new Date(1589543940 * 1000)).toDateString(),
                        extrinsic: fromWei(extrinsic)
                    }
                    console.log(calculation);
                    volatility -= 1;
                }
            }
            
            await run(1);
        });
    });
});