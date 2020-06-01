const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const chai = require("chai");
const BN = require("bn.js");
chai.use(require("chai-bn")(BN));
const PrimeOracle = artifacts.require("PrimeOracle");
const OracleLike = artifacts.require("OracleLike");
const utils = require("./utils");
const setup = require("./setup");
const constants = require("./constants");
const { toWei, fromWei, assertWithinError } = utils;
const { newERC20, newWeth } = setup;
const { ONE_ETHER, MILLION_ETHER } = constants.VALUES;
const { ERR_FEED_INVALID } = constants.ERR_CODES;
const { MAX_SLIPPAGE, MAX_ERROR_PTS, MANTISSA } = constants.PARAMETERS;
const { MAINNET_COMPOUND_DAI, MAINNET_DAI, MAINNET_WETH } = constants.ADDRESSES;

const LOG_INTRINSIC = false;
const LOG_EXTRINSIC = false;
const LOG_SPECIFIC = true;
const LOG_VERBOSE = false;

contract("Oracle contract", (accounts) => {
    let oracle, dai, weth, oracleLike;

    let Alice = accounts[0];

    before(async () => {
        oracleLike = await OracleLike.new();
        await oracleLike.setUnderlyingPrice((2.4e20).toString());
        dai = await newERC20("TEST DAI", "DAI", MILLION_ETHER);
        weth = await newWeth();
        oracle = await PrimeOracle.new(oracleLike.address, weth.address);

        getPriceInDai = async () => {
            let daiPerEth = new BN(await oracle.marketPrice());
            return daiPerEth;
        };

        getPriceInEth = async () => {
            let daiPerEth = new BN(await oracle.marketPrice());
            let mantissa = new BN(await oracle.MANTISSA());
            let ethPerDai = mantissa.div(daiPerEth);
            return ethPerDai;
        };

        console.log("Market Price", (await oracle.marketPrice()).toString());
        console.log(
            "Intrinsic",
            (
                await oracle.calculateIntrinsic(
                    dai.address,
                    weth.address,
                    toWei("250"),
                    toWei("1")
                )
            ).toString()
        );
    });

    /* describe("Deployment", () => {
        it("should deploy with the correct address and MCD_DAI Feed", async () => {
            expect(await oracle.oracle()).to.be.equal(oracleLike.address);
            expect(await oracle.feeds(MAINNET_DAI)).to.be.equal(
                MAINNET_COMPOUND_DAI
            );
            expect(await oracle.feeds(dai.address)).to.be.equal(dai.address);
        });
        it("should revert if feed is not set for address", async () => {
            await truffleAssert.reverts(
                oracle.marketPrice(Alice),
                ERR_FEED_INVALID
            );
        });
    }); */

    describe("Calculation General", () => {
        before(async () => {
            let ethPrice = fromWei(await getPriceInDai());
            function randomDate(start, end) {
                let date = Math.floor(+start + Math.random() * (end - start));
                return date;
            }
            function getRandomArbitrary(min, max) {
                return Math.random() * (max - min) + min;
            }
            generateRandomPutOption = () => {
                let option = {
                    volatility: Math.floor(1000 * Math.random()),
                    base: toWei(
                        (ethPrice * getRandomArbitrary(0.9, 1.1)).toString()
                    ),
                    price: toWei("1"),
                    expiry: randomDate(1594512000, 1609459200),
                };
                return option;
            };

            generateRandomCallOption = () => {
                let option = {
                    volatility: Math.floor(1000 * Math.random()),
                    base: toWei("1"),
                    price: toWei(
                        (ethPrice * getRandomArbitrary(0.9, 1.1)).toString()
                    ),
                    expiry: randomDate(1594512000, 1609459200),
                };
                return option;
            };
            calculatePremiums = async (
                tokenU,
                tokenS,
                volatility,
                base,
                price,
                expiry
            ) => {
                let premium = await oracle.calculatePremium(
                    tokenU,
                    tokenS,
                    volatility,
                    base,
                    price,
                    expiry
                );
                return premium;
            };
        });

        it("sets the market price and then gets it", async () => {
            let underlyingPrice = (2.4e20).toString();
            await oracleLike.setUnderlyingPrice(underlyingPrice);
            assert.equal(
                (await oracle.marketPrice()).toString(),
                underlyingPrice.toString()
            );
        });

        it("calculates a 0 premium and returns the min premium", async () => {
            let minPremium = await oracle.MIN_PREMIUM();
            let tokenU = dai.address;
            let tokenS = weth.address;
            let expiry = "2590753540"; // May 29 at 11:59 PM.
            let premium = await oracle.calculatePremium(
                tokenU,
                tokenS,
                0,
                1,
                1,
                expiry
            );
            assert.equal(minPremium.toString(), premium.toString());
        });
        it("Calculates the premium for ETH 200 DAI Put", async () => {
            let deribit = "0.0765"; // in ethers
            let tokenU = dai.address;
            let tokenS = weth.address;
            let volatility = 880; // Deribit's IV is 88% as of today May 3, 2020.
            let base = toWei("200");
            let price = toWei("1");
            let expiry = "2590753540"; // May 29 at 11:59 PM.
            let premium = await oracle.calculatePremium(
                tokenU,
                tokenS,
                volatility,
                base,
                price,
                expiry
            );
            if (LOG_VERBOSE)
                console.log("[PREMIUM IN WEI]", premium.toString());
            if (LOG_VERBOSE) console.log("[PREMIUM]", fromWei(premium));
            if (LOG_VERBOSE) console.log("[DERIBIT PREMIUM]", deribit);
        });

        it("Calculates premiums for arbritary Put options", async () => {
            let tokenU = dai.address;
            let tokenS = weth.address;
            const run = async (amount) => {
                for (let i = 0; i < amount; i++) {
                    let option = generateRandomPutOption();
                    let premium = await calculatePremiums(
                        tokenU,
                        tokenS,
                        option.volatility,
                        option.base,
                        option.price,
                        option.expiry
                    );

                    let calculation = {
                        volatility: option.volatility,
                        base: fromWei(option.base),
                        price: fromWei(option.price),
                        expiry: new Date(option.expiry * 1000).toDateString(),
                        premium: fromWei(premium),
                    };
                    if (LOG_VERBOSE) console.log(calculation);
                }
            };

            await run(1);
        });

        it("Calculates premiums for arbritary Call options", async () => {
            let tokenU = weth.address;
            let tokenS = dai.address;
            const run = async (amount) => {
                for (let i = 0; i < amount; i++) {
                    let option = generateRandomCallOption();
                    let premium = await calculatePremiums(
                        tokenU,
                        tokenS,
                        option.volatility,
                        option.base,
                        option.price,
                        option.expiry
                    );

                    let calculation = {
                        volatility: option.volatility,
                        base: fromWei(option.base),
                        price: fromWei(option.price),
                        expiry: new Date(option.expiry * 1000).toDateString(),
                        premium: fromWei(premium),
                    };
                    if (LOG_VERBOSE) console.log(calculation);
                }
            };

            await run(1);
        });
    });

    describe("Calculation Intrinsic", () => {
        before(async () => {
            calculateIntrinsic = async (tokenU, tokenS, base, price) => {
                let intrinsic = await oracle.calculateIntrinsic(
                    tokenU,
                    tokenS,
                    base,
                    price
                );
                let daiPerEth = await getPriceInDai();
                let ethPerDai = await getPriceInEth();
                let expected =
                    tokenU == dai.address
                        ? new BN(base).sub(daiPerEth)
                        : ethPerDai
                              .mul(daiPerEth.sub(new BN(price)))
                              .div(new BN(ONE_ETHER));
                let difference =
                    intrinsic > expected
                        ? new BN(intrinsic).sub(expected)
                        : new BN(0);
                if (LOG_VERBOSE)
                    console.log(difference.toString(), expected.toString());
                let error =
                    tokenU == dai.address && difference > new BN(0)
                        ? difference.div(new BN(expected)).mul(new BN(100))
                        : difference > new BN(0) && expected > new BN(0)
                        ? difference.div(new BN(expected)).mul(new BN(100))
                        : new BN(0);
                let results = {
                    market: daiPerEth.toString(),
                    base: base,
                    price: price,
                    intrinsic: intrinsic.toString(),
                    expected: expected.toString(),
                    difference: difference.toString(),
                    error: error.toString(),
                };

                if (LOG_INTRINSIC) console.log(results);
                /* assertWithinError(intrinsic, expected, MAX_SLIPPAGE);
                assertWithinError(error, new BN(100), MAX_ERROR_PTS); */
                return intrinsic;
            };
        });
        it("Calculates intrinsic for arbritary put options and compares to market", async () => {
            let tokenU = dai.address;
            let tokenS = weth.address;
            const run = async (amount) => {
                for (let i = 0; i < amount; i++) {
                    let option = generateRandomPutOption();
                    await calculateIntrinsic(
                        tokenU,
                        tokenS,
                        option.base,
                        option.price
                    );
                }
            };

            await run(5);
        });

        it("Calculates intrinsic for arbritary call options and compares to market", async () => {
            let tokenU = weth.address;
            let tokenS = dai.address;
            const run = async (amount) => {
                for (let i = 0; i < amount; i++) {
                    let option = generateRandomCallOption();
                    await calculateIntrinsic(
                        tokenU,
                        tokenS,
                        option.base,
                        option.price
                    );
                }
            };

            await run(5);
        });
    });

    describe("Calculation Extrinsic", () => {
        before(async () => {
            calculateExtrinsic = async (
                tokenU,
                tokenS,
                volatility,
                base,
                price,
                expiry
            ) => {
                let extrinsic = await oracle.calculateExtrinsic(
                    tokenU,
                    tokenS,
                    volatility,
                    base,
                    price,
                    expiry
                );
                return extrinsic;
            };
        });
        it("Calculates extrinsic premiums for arbritary put options parameters", async () => {
            let tokenU = dai.address;
            let tokenS = weth.address;
            const run = async (amount) => {
                for (let i = 0; i < amount; i++) {
                    let option = generateRandomPutOption();
                    let extrinsic = await calculateExtrinsic(
                        tokenU,
                        tokenS,
                        option.volatility,
                        option.base,
                        option.price,
                        option.expiry
                    );

                    let results = {
                        volatility: option.volatility,
                        base: fromWei(option.base),
                        price: fromWei(option.price),
                        expiry: new Date(option.expiry * 1000).toDateString(),
                        extrinsic: fromWei(extrinsic),
                    };
                    if (LOG_EXTRINSIC) console.log(results);
                }
            };

            await run(3);
        });

        it("Calculates extrinsic premiums for arbritary call options parameters", async () => {
            let tokenU = weth.address;
            let tokenS = dai.address;
            const run = async (amount) => {
                for (let i = 0; i < amount; i++) {
                    let option = generateRandomCallOption();
                    let extrinsic = await calculateExtrinsic(
                        tokenU,
                        tokenS,
                        option.volatility,
                        option.base,
                        option.price,
                        option.expiry
                    );

                    let results = {
                        volatility: option.volatility,
                        base: fromWei(option.base),
                        price: fromWei(option.price),
                        expiry: new Date(option.expiry * 1000).toDateString(),
                        extrinsic: fromWei(extrinsic),
                    };
                    if (LOG_EXTRINSIC) console.log(results);
                }
            };

            await run(3);
        });
    });

    describe("Calculation Specific", () => {
        it("Calculates premiums for deribit put series expiring Dec 25", async () => {
            let tokenU = dai.address;
            let tokenS = weth.address;
            let expiry = "1608897540";
            let volatility = 800;
            let date = new Date(+expiry * 1000).toDateString();
            let strikes = [
                "40",
                "60",
                "80",
                "100",
                "120",
                "140",
                "160",
                "180",
                "200",
                "220",
                "240",
                "260",
                "280",
                "320",
            ];

            for (let i = 0; i < strikes.length; i++) {
                let premium = await calculatePremiums(
                    tokenU,
                    tokenS,
                    volatility,
                    toWei(strikes[i]),
                    toWei("1"),
                    expiry
                );

                let intrinsic = await calculateIntrinsic(
                    tokenU,
                    tokenS,
                    toWei(strikes[i]),
                    toWei("1")
                );

                let extrinsic = await calculateExtrinsic(
                    tokenU,
                    tokenS,
                    volatility,
                    toWei(strikes[i]),
                    toWei("1"),
                    expiry
                );

                let results = {
                    strike: strikes[i],
                    date: date,
                    intrinsic: fromWei(intrinsic),
                    extrinsic: fromWei(extrinsic),
                    sum: fromWei(intrinsic.add(extrinsic)),
                    premium: fromWei(premium),
                };
                if (LOG_SPECIFIC) console.log(results);
            }
        });

        it("Calculates premiums for deribit call series expiring Dec 25", async () => {
            let tokenU = weth.address;
            let tokenS = dai.address;
            let expiry = "1608897540";
            let volatility = 800;
            let date = new Date(+expiry * 1000).toDateString();
            let strikes = [
                "40",
                "60",
                "80",
                "100",
                "120",
                "140",
                "160",
                "180",
                "200",
                "220",
                "240",
                "260",
                "280",
                "320",
            ];

            for (let i = 0; i < strikes.length; i++) {
                let premium = await calculatePremiums(
                    tokenU,
                    tokenS,
                    volatility,
                    toWei("1"),
                    toWei(strikes[i]),
                    expiry
                );

                let intrinsic = await calculateIntrinsic(
                    tokenU,
                    tokenS,
                    toWei("1"),
                    toWei(strikes[i])
                );

                let extrinsic = await calculateExtrinsic(
                    tokenU,
                    tokenS,
                    volatility,
                    toWei("1"),
                    toWei(strikes[i]),
                    expiry
                );

                let results = {
                    strike: strikes[i],
                    date: date,
                    intrinsic: fromWei(intrinsic),
                    extrinsic: fromWei(extrinsic),
                    sum: fromWei(intrinsic.add(extrinsic)),
                    premium: fromWei(premium),
                };
                if (LOG_SPECIFIC) console.log(results);
            }
        });
    });
});
