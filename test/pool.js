const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const chai = require("chai");
const BN = require("bn.js");
chai.use(require("chai-bn")(BN));

const UniRouter = artifacts.require("UniRouter");
const PrimeAMM = artifacts.require("PrimeAMM");
const PrimeTrader = artifacts.require("PrimeTrader");
const PrimeOracle = artifacts.require("PrimeOracle");
const OracleLike = artifacts.require("OracleLike");

const utils = require("./utils");
const setup = require("./setup");
const constants = require("./constants");
const {
    toWei,
    assertBNEqual,
    calculateAddLiquidity,
    calculateRemoveLiquidity,
    verifyOptionInvariants,
} = utils;
const {
    newERC20,
    newWeth,
    newRegistry,
    newOptionFactory,
    newPrimitive,
} = setup;
const {
    ZERO,
    HUNDRETH,
    TENTH,
    ONE_ETHER,
    FIVE_ETHER,
    TEN_ETHER,
    HUNDRED_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
} = constants.VALUES;

const {
    ERR_BAL_UNDERLYING,
    ERR_BAL_PULP,
    ERR_BAL_PRIME,
    ERR_ZERO_LIQUIDITY,
    ERR_PAUSED,
} = constants.ERR_CODES;

const { MAX_SLIPPAGE } = constants.PARAMETERS;

const LOG_VERBOSE = false;
const LOG_VOL = true;

contract("PAMM Test", (accounts) => {
    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let tokenU,
        tokenS,
        base,
        price,
        expiry,
        trader,
        prime,
        redeem,
        oracle,
        pool,
        factory,
        factoryOption,
        factoryRegistry,
        exchange,
        oracleLike,
        Primitive,
        router,
        pamm;

    before(async () => {
        // Setup tokens
        weth = await newWeth();
        dai = await newERC20("TEST DAI", "DAI", MILLION_ETHER);

        // Setup factories
        registry = await newRegistry();
        factoryOption = await newOptionFactory(registry);

        // Set up test oracle.
        oracleLike = await OracleLike.new();
        await oracleLike.setUnderlyingPrice((2.4e20).toString());

        // Setup option parameters.
        tokenU = weth;
        tokenS = dai;
        base = toWei("1");
        price = toWei("300");
        expiry = "1690868800"; // June 26, 2020, 0:00:00 UTC

        // Call the deployOption function.
        Primitive = await newPrimitive(
            registry,
            tokenU,
            tokenS,
            base,
            price,
            expiry
        );

        // Setup option contract instances.
        prime = Primitive.prime;
        redeem = Primitive.redeem;

        // Setup extension contracts.
        trader = await PrimeTrader.new(weth.address);
        oracle = await PrimeOracle.new(oracleLike.address, weth.address);
        router = await UniRouter.new(dai.address, weth.address, oracle.address);

        // Setup starting liquidity in test router.
        await dai.mint(router.address, toWei("1000"));
        await weth.deposit({ value: toWei("100") });
        await weth.transfer(router.address, toWei("100"));

        // Deploy a pool contract.
        pool = await PrimeAMM.new(
            weth.address,
            prime.address,
            oracle.address,
            registry.address,
            router.address
        );

        // Seed some WETH into the main accounts.
        await weth.deposit({
            from: Alice,
            value: HUNDRED_ETHER,
        });
        await weth.deposit({
            from: Bob,
            value: HUNDRED_ETHER,
        });

        // Approve the pool and trader contracts.
        await dai.approve(pool.address, MILLION_ETHER, {
            from: Alice,
        });
        await weth.approve(pool.address, MILLION_ETHER, {
            from: Alice,
        });
        await prime.approve(pool.address, MILLION_ETHER, {
            from: Alice,
        });
        await dai.approve(trader.address, MILLION_ETHER, {
            from: Alice,
        });
        await weth.approve(trader.address, MILLION_ETHER, {
            from: Alice,
        });
        await prime.approve(trader.address, MILLION_ETHER, {
            from: Alice,
        });
        await prime.approve(prime.address, MILLION_ETHER, {
            from: Alice,
        });

        // Basic utility functions.
        getEthBalance = async (address) => {
            let bal = new BN(await web3.eth.getBalance(address));
            return bal;
        };

        getBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        };

        getTokenBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        };

        getTotalSupply = async () => {
            let bal = new BN(await pool.totalSupply());
            return bal;
        };

        getTotalPoolBalance = async () => {
            let bal = new BN(await pool.totalPoolBalance(prime.address));
            return bal;
        };

        getPremium = async () => {
            let premium = await oracle.calculatePremium(
                tokenU.address,
                tokenS.address,
                await pool.volatility(),
                await prime.base(),
                await prime.price(),
                await prime.expiry()
            );
            premium = new BN(premium);
            return premium;
        };

        getVolatilityProxy = async () => {
            let vol = await pool.calculateVolatilityProxy(prime.address);
            let utilized = await pool.totalUtilized(prime.address);
            let unutilized = await pool.totalUnutilized(prime.address);
            let totalPoolBalance = await pool.totalPoolBalance(prime.address);
            let balanceU = await tokenU.balanceOf(pool.address);
            let balanceR = await getTokenBalance(redeem, pool.address);
            if (LOG_VOL) console.log("UTILIZED", utilized.toString());
            if (LOG_VOL) console.log("UNUTILIZED", unutilized.toString());
            if (LOG_VOL) console.log("TOTALPOOL", totalPoolBalance.toString());
            if (LOG_VOL) console.log("BALANCEU", balanceU.toString());
            if (LOG_VOL) console.log("BALANCER", balanceR.toString());
            if (LOG_VOL) console.log("VOL", vol.toString());
            expect(vol).to.be.a.bignumber.that.is.at.least(new BN(1000));
        };
    });

    describe("Deployment", () => {
        it("should return the correct weth address", async () => {
            expect((await pool.WETH()).toString().toUpperCase()).to.be.eq(
                weth.address.toUpperCase()
            );
        });

        it("should return the correct oracle address", async () => {
            expect((await pool.oracle()).toString().toUpperCase()).to.be.eq(
                oracle.address.toUpperCase()
            );
        });

        it("should return the correct factory address", async () => {
            expect((await pool.factory()).toString().toUpperCase()).to.be.eq(
                registry.address.toUpperCase()
            );
        });

        it("should return the initialized volatility", async () => {
            expect((await pool.volatility()).toString()).to.be.eq("500");
        });

        it("check volatility", async () => {
            await getVolatilityProxy();
        });

        it("should get balances and return 0", async () => {
            let balances = await pool.balances();
            expect(balances.balanceU.toString()).to.be.eq(ZERO.toString());
            expect(balances.balanceR.toString()).to.be.eq(ZERO.toString());
        });
    });

    describe("kill", () => {
        it("revert if msg.sender is not owner", async () => {
            await truffleAssert.reverts(
                pool.kill({ from: Bob }),
                "Ownable: caller is not the owner"
            );
        });

        it("should pause contract", async () => {
            await pool.kill();
            assert.equal(await pool.paused(), true);
        });

        it("should revert mint function call while paused contract", async () => {
            await truffleAssert.reverts(pool.deposit(ONE_ETHER), ERR_PAUSED);
        });

        it("should unpause contract", async () => {
            await pool.kill();
            assert.equal(await pool.paused(), false);
        });
    });

    describe("deposit", () => {
        beforeEach(async function() {
            pool = await PrimeAMM.new(
                weth.address,
                prime.address,
                oracle.address,
                registry.address,
                router.address
            );
            await dai.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await weth.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            deposit = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let balance0U = await getTokenBalance(tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0CU = await getTokenBalance(tokenU, pool.address);
                let balance0TS = await getTotalSupply();
                let balance0TP = await getTotalPoolBalance();

                let liquidity = calculateAddLiquidity(
                    inTokenU,
                    balance0TS,
                    balance0TP
                );
                await getVolatilityProxy();
                /* console.log(
                    inTokenU.toString(),
                    balance0CU.toString(),
                    balance0TS.toString(),
                    balance0TP.toString(),
                    liquidity.toString()
                ); */
                let depo = await pool.deposit(inTokenU, {
                    from: Alice,
                });
                await getVolatilityProxy();
                truffleAssert.eventEmitted(depo, "Deposit", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.inTokenU.toString()).to.be.eq(
                            inTokenU.toString()
                        ) &&
                        expect(ev.outTokenPULP.toString()).to.be.eq(
                            liquidity.toString()
                        )
                    );
                });

                let balance1U = await getTokenBalance(tokenU, Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1CU = await getTokenBalance(tokenU, pool.address);
                let balance1TS = await getTotalSupply();
                let balance1TP = await getTotalPoolBalance();

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaTS = balance1TS.sub(balance0TS);
                let deltaTP = balance1TP.sub(balance0TP);

                assertBNEqual(deltaU, inTokenU.neg());
                assertBNEqual(deltaP, liquidity);
                assertBNEqual(deltaCU, inTokenU);
                assertBNEqual(deltaTS, liquidity);
                assertBNEqual(deltaTP, inTokenU);
            };
        });

        it("should revert if inTokenU is below the min liquidity", async () => {
            await truffleAssert.reverts(pool.deposit(1), "ERR_ZERO_LIQUIDITY");
        });

        it("should revert if inTokenU is above the user's balance", async () => {
            await truffleAssert.reverts(
                pool.deposit(MILLION_ETHER),
                ERR_BAL_UNDERLYING
            );
        });

        it("check volatility", async () => {
            await getVolatilityProxy();
        });

        it("should deposit tokenU and receive tokenPULP", async () => {
            await deposit(ONE_ETHER);
        });

        it("should deposit random amounts of tokenU and receive tokenPULP", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(ONE_ETHER * Math.random()).toString();
                    await deposit(amt);
                }
            };

            await run(2);
        });
    });

    describe("withdraw", () => {
        beforeEach(async function() {
            pool = await PrimeAMM.new(
                weth.address,
                prime.address,
                oracle.address,
                registry.address,
                router.address
            );
            await dai.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await weth.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            withdraw = async (inTokenPULP) => {
                inTokenPULP = new BN(inTokenPULP);
                let balance0U = await getTokenBalance(tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0R = await getTokenBalance(redeem, pool.address);
                let balance0RinU = balance0R
                    .mul(new BN(base))
                    .div(new BN(price));
                let balance0CS = await getBalance(tokenS, pool.address);
                let balance0CU = await getBalance(tokenU, pool.address);
                let balance0TS = await getTotalSupply();
                let balance0TP = await getTotalPoolBalance();

                let unutilized0 = await pool.totalUnutilized(prime.address);
                let utilized0 = await pool.totalUtilized(prime.address);

                let liquidity = calculateRemoveLiquidity(
                    inTokenPULP,
                    balance0TS,
                    balance0TP
                );

                if (LOG_VERBOSE) console.log("[INITIALSTATE]");
                if (LOG_VERBOSE) console.log("ALICE U", balance0U.toString());
                if (LOG_VERBOSE) console.log("ALICE P", balance0P.toString());
                if (LOG_VERBOSE)
                    console.log("ALICE WITHDRAW", inTokenPULP.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT U", balance0CU.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT S", balance0CS.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT R", balance0R.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT RU", balance0RinU.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT TS", balance0TS.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT TP", balance0TP.toString());
                if (LOG_VERBOSE)
                    console.log("WITHDRAW LIQUIDITY", liquidity.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT UTILIZED", utilized0.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT UNUTILIZED", unutilized0.toString());
                await getVolatilityProxy();
                let event = await pool.withdraw(inTokenPULP, {
                    from: Alice,
                });
                await getVolatilityProxy();
                truffleAssert.eventEmitted(event, "Withdraw", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.inTokenPULP.toString()).to.be.eq(
                            inTokenPULP.toString()
                        )
                    );
                });

                let balance1U = await getTokenBalance(tokenU, Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1CU = await getBalance(tokenU, pool.address);
                let balance1TS = await getTotalSupply();
                let balance1TP = await getTotalPoolBalance();
                let balance1R = await getTokenBalance(redeem, pool.address);
                let balance1RinU = balance1R
                    .mul(new BN(base))
                    .div(new BN(price));
                let balance1CS = await getBalance(tokenS, pool.address);
                let unutilized1 = await pool.totalUnutilized(prime.address);
                let utilized1 = await pool.totalUtilized(prime.address);

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaTS = balance1TS.sub(balance0TS);
                let deltaTP = balance1TP.sub(balance0TP);

                if (LOG_VERBOSE) console.log("[ENDSTATE]");
                if (LOG_VERBOSE) console.log("ALICE U", balance1U.toString());
                if (LOG_VERBOSE) console.log("ALICE P", balance1P.toString());
                if (LOG_VERBOSE)
                    console.log("ALICE WITHDRAW", inTokenPULP.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT U", balance1CU.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT S", balance1CS.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT R", balance1R.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT RU", balance1RinU.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT TS", balance1TS.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT TP", balance1TP.toString());
                if (LOG_VERBOSE)
                    console.log("WITHDRAW LIQUIDITY", liquidity.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT UTILIZED", utilized1.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT UNUTILIZED", unutilized1.toString());
                if (LOG_VERBOSE)
                    console.log("DELTA ACTUAL", deltaTP.toString());

                let slippage = new BN(MAX_SLIPPAGE);
                let maxValue = liquidity.add(liquidity.div(slippage));
                let minValue = liquidity.sub(liquidity.div(slippage));
                if (LOG_VERBOSE) console.log("[MAXVALUE]", maxValue.toString());
                if (LOG_VERBOSE) console.log("[LIQ]", liquidity.toString());
                if (LOG_VERBOSE) console.log("[MINVALUE]", minValue.toString());
                expect(deltaU).to.be.a.bignumber.that.is.at.most(maxValue);
                expect(deltaU).to.be.a.bignumber.that.is.at.least(minValue);
                assertBNEqual(deltaP, inTokenPULP.neg());
                assertBNEqual(deltaTS, inTokenPULP.neg());
                expect(deltaTP).to.be.a.bignumber.that.is.at.least(
                    maxValue.neg()
                );
                expect(deltaTP).to.be.a.bignumber.that.is.at.most(
                    minValue.neg()
                );
            };
        });

        it("should revert if inTokenU is above the user's balance", async () => {
            await truffleAssert.reverts(
                pool.withdraw(MILLION_ETHER),
                ERR_BAL_PULP
            );
        });

        it("should revert if inTokenU is 0", async () => {
            await truffleAssert.reverts(pool.withdraw(0), ERR_BAL_PULP);
        });

        it("should revert if not enough tokenU to withdraw", async () => {
            await pool.deposit(ONE_ETHER);
            let balanceU = await tokenU.balanceOf(pool.address);
            await weth.deposit({ value: ONE_ETHER });
            await weth.deposit({ value: THOUSAND_ETHER });
            await pool.buy(balanceU);
            await trader.safeExercise(
                prime.address,
                await prime.balanceOf(Alice),
                Alice
            );
            await getVolatilityProxy();
            await truffleAssert.reverts(
                pool.withdraw(await pool.balanceOf(Alice)),
                "ERR_BAL_INSUFFICIENT"
            );
        });

        it("should withdraw tokenU by burning tokenPULP", async () => {
            await deposit(TEN_ETHER);
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            await run(5);
        });
    });

    describe("buy", () => {
        beforeEach(async function() {
            pool = await PrimeAMM.new(
                weth.address,
                prime.address,
                oracle.address,
                registry.address,
                router.address
            );
            await dai.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await weth.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            buy = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let balance0U = await getBalance(tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0Prime = await getTokenBalance(prime, Alice);
                let balance0S = await getBalance(tokenS, Alice);
                let balance0CU = await getBalance(tokenU, pool.address);
                let balance0TS = await getTotalSupply();
                let balance0TP = await getTotalPoolBalance();
                let premium = await getPremium();
                premium = premium.mul(inTokenU).div(new BN(toWei("1")));

                await getVolatilityProxy();
                let event = await pool.buy(inTokenU, {
                    from: Alice,
                });
                await getVolatilityProxy();
                truffleAssert.eventEmitted(event, "Buy", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.outTokenU.toString()).to.be.eq(
                            inTokenU.toString()
                        )
                    );
                });

                let balance1U = await getBalance(tokenU, Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1Prime = await getTokenBalance(prime, Alice);
                let balance1S = await getBalance(tokenS, Alice);
                let balance1CU = await getBalance(tokenU, pool.address);
                let balance1TS = await getTotalSupply();
                let balance1TP = await getTotalPoolBalance();

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaS = balance1S.sub(balance0S);
                let deltaPrime = balance1Prime.sub(balance0Prime);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaTS = balance1TS.sub(balance0TS);
                let deltaTP = balance1TP.sub(balance0TP);

                /* assertBNEqual(deltaU, premium.neg()); */
                assertBNEqual(deltaP, new BN(0));
                assertBNEqual(deltaPrime, inTokenU);
                assertBNEqual(deltaS, new BN(0));
                /* assertBNEqual(deltaCU, inTokenU.neg().iadd(premium)); */
                assertBNEqual(deltaTS, new BN(0));
            };
        });

        it("should revert if inTokenU is 0", async () => {
            await truffleAssert.reverts(pool.buy(0), "ERR_ZERO");
        });

        it("should revert if inTokenU is greater than the pool's balance", async () => {
            await truffleAssert.reverts(
                pool.buy(MILLION_ETHER),
                ERR_BAL_UNDERLYING
            );
        });

        it("should buy tokenP by paying some premium of tokenU", async () => {
            await deposit(ONE_ETHER);
            await buy(ONE_ETHER);
        });

        it("should buy multiple orders of tokenP by paying some premium of tokenU", async () => {
            await deposit(FIVE_ETHER);
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await buy(amt);
                }
            };

            await run(2);
        });
    });

    describe("sell", () => {
        beforeEach(async function() {
            pool = await PrimeAMM.new(
                weth.address,
                prime.address,
                oracle.address,
                registry.address,
                router.address
            );
            await dai.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await weth.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            sell = async (inTokenP) => {
                inTokenP = new BN(inTokenP);
                let balance0U = await getBalance(tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0Prime = await getTokenBalance(prime, Alice);
                let balance0S = await getBalance(tokenS, Alice);
                let balance0R = await getBalance(redeem, pool.address);
                let balance0CU = await getBalance(tokenU, pool.address);
                let balance0TS = await getTotalSupply();
                let balance0TP = await getTotalPoolBalance();

                let premium = await getPremium();
                premium = premium.mul(inTokenP).div(new BN(toWei("1")));
                let outTokenR = inTokenP.mul(new BN(price)).div(new BN(base));

                if (LOG_VERBOSE) console.log("[INITIALSTATE]");
                if (LOG_VERBOSE) console.log("ALICE U", balance0U.toString());
                if (LOG_VERBOSE) console.log("ALICE P", balance0P.toString());
                if (LOG_VERBOSE) console.log("ALICE SELL", inTokenP.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT U", balance0CU.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT R", balance0R.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT TS", balance0TS.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT TP", balance0TP.toString());
                if (LOG_VERBOSE)
                    console.log("ESTIMATED PREMIUM", premium.toString());
                await getVolatilityProxy();
                console.log(
                    "ALICE P BAL",
                    (await prime.balanceOf(Alice)).toString(),
                    "INTOKENP",
                    inTokenP.toString()
                );
                let event = await pool.sell(inTokenP, {
                    from: Alice,
                });
                await getVolatilityProxy();
                truffleAssert.eventEmitted(event, "Sell", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.inTokenP.toString()).to.be.eq(
                            inTokenP.toString()
                        )
                    );
                });

                let balance1U = await getBalance(tokenU, Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1Prime = await getTokenBalance(prime, Alice);
                let balance1R = await getBalance(redeem, pool.address);
                let balance1S = await getBalance(tokenS, Alice);
                let balance1CU = await getBalance(tokenU, pool.address);
                let balance1TS = await getTotalSupply();
                let balance1TP = await getTotalPoolBalance();

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaS = balance1S.sub(balance0S);
                let deltaR = balance1R.sub(balance0R);
                let deltaPrime = balance1Prime.sub(balance0Prime);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaTS = balance1TS.sub(balance0TS);

                if (LOG_VERBOSE) console.log("[ENDSTATE]");
                if (LOG_VERBOSE) console.log("ALICE U", balance1U.toString());
                if (LOG_VERBOSE) console.log("ALICE P", balance1P.toString());
                if (LOG_VERBOSE) console.log("ALICE SELL", inTokenP.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT U", balance1CU.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT R", balance1R.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT TS", balance1TS.toString());
                if (LOG_VERBOSE)
                    console.log("CONTRACT TP", balance1TP.toString());
                if (LOG_VERBOSE)
                    console.log("ESTIMATED PREMIUM", premium.toString());

                let discountedPremium = premium.sub(premium.div(new BN(5)));
                let expectedDeltaU = deltaR
                    .mul(new BN(base))
                    .div(new BN(price));
                expectedDeltaU.iadd(discountedPremium);

                expect(deltaU).to.be.a.bignumber.that.is.at.most(
                    discountedPremium.add(new BN(1))
                );
                expect(deltaU).to.be.a.bignumber.that.is.at.least(
                    discountedPremium.sub(new BN(1))
                );
                expect(deltaCU).to.be.a.bignumber.that.is.at.least(
                    expectedDeltaU.add(new BN(10)).neg()
                );
                expect(deltaCU).to.be.a.bignumber.that.is.at.most(
                    expectedDeltaU.sub(new BN(10)).neg()
                );
                assertBNEqual(deltaP, new BN(0));
                assertBNEqual(deltaPrime, inTokenP.neg());
                assertBNEqual(deltaS, new BN(0));
                assertBNEqual(deltaTS, new BN(0));
            };
        });

        it("should revert if inTokenP is 0", async () => {
            await truffleAssert.reverts(pool.sell(0), ERR_BAL_PRIME);
        });

        it("should revert if inTokenP is greater than the user's balance", async () => {
            await truffleAssert.reverts(
                pool.sell(MILLION_ETHER),
                ERR_BAL_PRIME
            );
        });

        it("check volatility", async () => {
            await getVolatilityProxy();
        });

        it("should sell tokenP by paying some premium of tokenU", async () => {
            await deposit(ONE_ETHER);
            await buy(ONE_ETHER);
            await sell(await pool.totalUtilized(prime.address));
        });

        it("should sell multiple orders of tokenP by paying some premium of tokenU", async () => {
            await deposit(FIVE_ETHER);
            await buy(ONE_ETHER);
            console.log(
                "ALICE BALANCE P BEFORE RUN",
                (await prime.balanceOf(Alice)).toString()
            );
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    console.log(
                        "[POOL REDEEM BAL",
                        (await redeem.balanceOf(pool.address)).toString(),
                        base.toString(),
                        price.toString()
                    );
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await sell(amt);
                }
            };

            await run(3);
        });
    });

    describe("Withdraw redeemed strike tokens()", () => {
        before(async function() {
            pool = await PrimeAMM.new(
                weth.address,
                prime.address,
                oracle.address,
                registry.address,
                router.address
            );
            await dai.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await weth.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
        });
        it("check volatility", async () => {
            await getVolatilityProxy();
        });
        it("utilize the rest of the pool", async () => {
            if (tokenU.address == weth.address) {
                await tokenU.deposit({ from: Alice, value: THOUSAND_ETHER });
            }
            await pool.deposit(ONE_ETHER, { from: Alice });
            let balanceCU = new BN(await tokenU.balanceOf(pool.address));
            await pool.buy(balanceCU, {
                from: Alice,
            });
        });

        it("should exercise the options so the pool can redeem them in withdraw", async () => {
            await trader.safeExercise(
                prime.address,
                await prime.balanceOf(Alice),
                Alice
            );
        });

        it("should revert if inTokenU is above the user's balance", async () => {
            await truffleAssert.reverts(
                pool.withdraw(MILLION_ETHER),
                ERR_BAL_PULP
            );
        });

        it("should revert if inTokenU is 0", async () => {
            await truffleAssert.reverts(pool.withdraw(0), ERR_BAL_PULP);
        });

        it("should swap tokenR -> tokenS -> tokenU for user to withdraw", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(TENTH * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            await run(2);
        });
    });

    describe("calculateVolatilityProxy", () => {
        it("check volatility", async () => {
            await getVolatilityProxy();
        });
    });

    describe("Run Transactions", () => {
        beforeEach(async function() {
            pool = await PrimeAMM.new(
                weth.address,
                prime.address,
                oracle.address,
                registry.address,
                router.address
            );
            await dai.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await weth.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
        });
        it("should be able to deposit, withdraw, and buy fluidly", async () => {
            await deposit(ONE_ETHER);
            await buy(ONE_ETHER);
            const runDeposit = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(TEN_ETHER * Math.random()).toString();
                    await deposit(amt);
                }
            };

            const runWithdraw = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            const runBuy = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(ONE_ETHER * Math.random()).toString();
                    console.log("BUY", amt.toString());
                    await buy(amt);
                }
            };

            const runSell = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await sell(amt);
                }
            };

            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    await getVolatilityProxy();
                    await runDeposit(1);
                    await runBuy(1);
                    if (new BN(await prime.balanceOf(Alice)).gt(new BN(0))) {
                        await trader.safeExercise(
                            prime.address,
                            await prime.balanceOf(Alice),
                            Alice
                        );
                    }
                    await runBuy(1);
                    await runSell(1);
                    await runWithdraw(1);
                    await getVolatilityProxy();
                }
            };

            await run(3);
        });
    });

    /* describe("depositEth", () => {
        before(async () => {
            tokenU = weth;
            tokenS = dai;
            trader = await PrimeTrader.new(weth.address);

            Primitive = await newPrimitive(
                factoryOption,
                tokenU,
                tokenS,
                base,
                price,
                expiry
            );

            prime = Primitive.prime;
            redeem = Primitive.redeem;

            // Setup prime oracle and feed for dai.
            oracle = await PrimeOracle.new(oracleLike.address, weth.address);
            await oracle.addFeed(tokenU.address);
            await oracle.addFeed(tokenS.address);

            pool = await PrimePool.new(
                weth.address,
                prime.address,
                oracle.address,
                factory.address,
                poolName,
                poolSymbol
            );
            tokenPULP = pool.address;

            await dai.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await weth.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });
            await dai.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await weth.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });

            await prime.approve(pool.address, MILLION_ETHER, {
                from: Alice,
            });

            await prime.approve(prime.address, MILLION_ETHER, {
                from: Alice,
            });
            depositEth = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let balance0U = await getEthBalance(Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0CU = await getBalance(tokenU, pool.address);
                let balance0TS = await getTotalSupply();
                let balance0TP = await getTotalPoolBalance();

                let liquidity = calculateAddLiquidity(
                    inTokenU,
                    balance0TS,
                    balance0TP
                );

                if (balance0U.lt(inTokenU)) {
                    return;
                }
                await getVolatilityProxy();
                let depo = await pool.depositEth({
                    from: Alice,
                    value: inTokenU,
                });
                await getVolatilityProxy();
                truffleAssert.eventEmitted(depo, "Deposit", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.inTokenU.toString()).to.be.eq(
                            inTokenU.toString()
                        ) &&
                        expect(ev.outTokenPULP.toString()).to.be.eq(
                            liquidity.toString()
                        )
                    );
                });

                let balance1U = await getEthBalance(Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1CU = await getBalance(tokenU, pool.address);
                let balance1TS = await getTotalSupply();
                let balance1TP = await getTotalPoolBalance();

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaTS = balance1TS.sub(balance0TS);
                let deltaTP = balance1TP.sub(balance0TP);

                assertBNEqual(deltaU, inTokenU.neg());
                let slippage = new BN(MAX_SLIPPAGE);
                let maxValue = inTokenU.add(inTokenU.div(slippage));
                let minValue = inTokenU.sub(inTokenU.div(slippage));
                expect(deltaU).to.be.a.bignumber.that.is.at.least(
                    maxValue.neg()
                );
                expect(deltaU).to.be.a.bignumber.that.is.at.most(
                    minValue.neg()
                );
                assertBNEqual(deltaP, liquidity);
                assertBNEqual(deltaCU, inTokenU);
                assertBNEqual(deltaTS, liquidity);
                assertBNEqual(deltaTP, inTokenU);
            };
        });

        it("should revert if inTokenU is below the min liquidity", async () => {
            await truffleAssert.reverts(
                pool.depositEth({ value: 1 }),
                ERR_BAL_UNDERLYING
            );
        });

        it("should revert if outTokenPULP is 0", async () => {
            await tokenU.deposit({ from: Alice, value: HUNDRED_ETHER });
            await tokenU.transfer(pool.address, HUNDRED_ETHER, {
                from: Alice,
            });
            let min = await pool.MIN_LIQUIDITY();
            await pool.deposit(min);
            await truffleAssert.reverts(
                pool.depositEth({ value: min }),
                ERR_ZERO_LIQUIDITY
            );
        });
        it("check volatility", async () => {
            await getVolatilityProxy();
        });

        it("should depositEth tokenU and receive tokenPULP", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(TEN_ETHER * Math.random()).toString();
                    await depositEth(amt);
                }
            };

            await run(1);
        });
    }); */
});
