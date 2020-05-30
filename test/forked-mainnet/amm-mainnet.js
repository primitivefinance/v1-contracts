const { assert, expect } = require("chai");
const chai = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
chai.use(require("chai-bn")(BN));
const daiABI = require("../../contracts/test/abi/dai");
const Weth = require("../../contracts/test/abi/WETH9.json");
const PrimeOption = artifacts.require("PrimeOption");
const PrimeAMM = artifacts.require("PrimeAMM");
const PrimeTrader = artifacts.require("PrimeTrader");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const PrimeOracle = artifacts.require("PrimeOracle");
const utils = require("../utils");
const setup = require("../setup");
const constants = require("../constants");
const {
    toWei,
    fromWei,
    assertBNEqual,
    calculateAddLiquidity,
    calculateRemoveLiquidity,
    verifyOptionInvariants,
} = utils;
const { newERC20, newWeth, newOptionFactory, newPrime, newRedeem } = setup;
const {
    TREASURER,
    MAINNET_DAI,
    MAINNET_ORACLE,
    MAINNET_WETH,
    MAINNET_UNI_FACTORY,
    MAINNET_UNI_ROUTER01,
} = constants.ADDRESSES;
const {
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

contract("AMM - forked-mainnet", (accounts) => {
    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let DAI,
        WETH,
        tokenP,
        tokenPULP,
        _tokenU,
        _tokenS,
        tokenU,
        tokenS,
        marketId,
        poolName,
        poolSymbol,
        optionName,
        optionSymbol,
        redeemName,
        redeemSymbol,
        base,
        price,
        expiry,
        trader,
        prime,
        redeem,
        oracle,
        pool,
        factory,
        exchange,
        id;

    const assertBNEqual = (actualBN, expectedBN, message) => {
        assert.equal(actualBN.toString(), expectedBN.toString(), message);
    };

    const calculateAddLiquidity = (_inTokenU, _totalSupply, _totalBalance) => {
        let inTokenU = new BN(_inTokenU);
        let totalSupply = new BN(_totalSupply);
        let totalBalance = new BN(_totalBalance);
        if (totalBalance.eq(new BN(0))) {
            return inTokenU;
        }
        let liquidity = inTokenU.mul(totalSupply).div(totalBalance);
        return liquidity;
    };

    const calculateRemoveLiquidity = (
        _inTokenPULP,
        _totalSupply,
        _totalBalance
    ) => {
        let inTokenPULP = new BN(_inTokenPULP);
        let totalSupply = new BN(_totalSupply);
        let totalBalance = new BN(_totalBalance);
        let outTokenU = inTokenPULP.mul(totalBalance).div(totalSupply);
        return outTokenU;
    };

    const calculateBuy = (_inTokenS, _base, _price, _premium) => {
        let inTokenS = new BN(_inTokenS);
        let base = new BN(_base);
        let price = new BN(_price);
        let outTokenU = inTokenS.mul(base).div(price);
        let premium = new BN(_premium);
        let deltaU = outTokenU.sub(premium).neg();
        return deltaU;
    };

    before(async function() {
        id = await web3.eth.net.getId();
        if (id !== 999) this.skip();
        DAI = new web3.eth.Contract(daiABI, MAINNET_DAI);

        // Initialize our accounts with forked mainnet DAI and WETH.
        mintDai = async (account) => {
            await web3.eth.sendTransaction({
                from: Alice,
                to: TREASURER,
                value: toWei("0.1"),
            });

            await DAI.methods
                .transfer(account, toWei("100000").toString())
                .send({
                    from: TREASURER,
                    gasLimit: 800000,
                });
        };

        await mintDai(Alice);
        await mintDai(Bob);

        WETH = new web3.eth.Contract(Weth.abi, MAINNET_WETH);
        await WETH.methods.deposit().send({
            from: Alice,
            value: FIVE_ETHER,
        });
        await WETH.methods.deposit().send({
            from: Bob,
            value: FIVE_ETHER,
        });

        // test for $300 ETH CALL EXPIRING
        _tokenU = WETH;
        _tokenS = DAI;
        tokenU = MAINNET_WETH;
        tokenS = MAINNET_DAI;
        poolName = "Primitive V1 Pool";
        poolSymbol = "PULP";
        optionName = "ETH Call 300 DAI Expiring June 26 2020";
        optionSymbol = "PRIME";
        redeemName = "ETH Call Redeemable Token";
        redeemSymbol = "REDEEM";
        base = toWei("1");
        price = toWei("300");
        expiry = "1593129600"; // June 26, 2020, 0:00:00 UTC

        trader = await PrimeTrader.new(MAINNET_WETH);
        factory = await newOptionFactory();
        prime = await newPrime(
            factory,
            _tokenU._address,
            _tokenS._address,
            base,
            price,
            expiry
        );
        redeem = await newRedeem(prime);

        Primitive = {
            tokenU: tokenU,
            tokenS: tokenS,
            prime: prime,
            redeem: redeem,
        };

        oracle = await PrimeOracle.new(MAINNET_ORACLE, MAINNET_WETH);
        pool = await PrimeAMM.new(
            MAINNET_WETH,
            prime.address,
            oracle.address,
            Alice,
            MAINNET_UNI_ROUTER01
        );
        tokenPULP = pool.address;
        tokenP = prime.address;
        tokenR = redeem.address;

        await DAI.methods.approve(pool.address, MILLION_ETHER).send({
            from: Alice,
        });
        await WETH.methods.approve(pool.address, MILLION_ETHER).send({
            from: Alice,
        });
        await DAI.methods.approve(trader.address, MILLION_ETHER).send({
            from: Alice,
        });
        await WETH.methods.approve(trader.address, MILLION_ETHER).send({
            from: Alice,
        });
        await prime.approve(trader.address, MILLION_ETHER, {
            from: Alice,
        });
        await prime.approve(pool.address, MILLION_ETHER, {
            from: Alice,
        });

        getBalance = async (token, address) => {
            let bal = new BN(await token.methods.balanceOf(address).call());
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
            let bal = new BN(await pool.totalPoolBalance(tokenP));
            return bal;
        };

        getPremium = async () => {
            let premium = await oracle.calculatePremium(
                tokenU,
                tokenS,
                await pool.volatility(),
                await prime.base(),
                await prime.price(),
                await prime.expiry()
            );
            premium = new BN(premium);
            return premium;
        };
    });

    describe("Deployment", function() {
        before(function() {
            if (id !== 999) this.skip();
        });
        it("should return the correct name", async function() {
            expect(await pool.name()).to.be.eq(poolName);
        });

        it("should return the correct symbol", async function() {
            expect(await pool.symbol()).to.be.eq(poolSymbol);
        });

        it("should return the correct weth address", async function() {
            expect((await pool.WETH()).toString().toUpperCase()).to.be.eq(
                MAINNET_WETH.toUpperCase()
            );
        });

        it("should return the correct oracle address", async function() {
            expect((await pool.oracle()).toString().toUpperCase()).to.be.eq(
                oracle.address.toUpperCase()
            );
        });
    });

    describe("deposit", function() {
        before(async () => {
            if (id !== 999) this.skip();
            deposit = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let balance0U = await getBalance(_tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0CU = await getBalance(_tokenU, pool.address);
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

                let depo = await pool.deposit(inTokenU, {
                    from: Alice,
                });

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

                let balance1U = await getBalance(_tokenU, Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1CU = await getBalance(_tokenU, pool.address);
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

        it("should revert if inTokenU is below the min liquidity", async function() {
            await truffleAssert.reverts(pool.deposit(1), ERR_BAL_UNDERLYING);
        });
        it("should revert if inTokenU is above the user's balance", async function() {
            await truffleAssert.reverts(
                pool.deposit(MILLION_ETHER),
                ERR_BAL_UNDERLYING
            );
        });

        it("should deposit tokenU and receive tokenPULP", async function() {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(TEN_ETHER * Math.random()).toString();
                    await deposit(amt);
                }
            };

            await run(1);
        });
    });

    describe("withdraw", function() {
        before(async () => {
            if (id !== 999) this.skip();
            withdraw = async (inTokenPULP) => {
                inTokenPULP = new BN(inTokenPULP);
                let balance0U = await getBalance(_tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);

                let balance0R = await getTokenBalance(redeem, pool.address);
                let balance0RinU = balance0R
                    .mul(new BN(base))
                    .div(new BN(price));
                let balance0CS = await getBalance(_tokenS, pool.address);
                let balance0CU = await getBalance(_tokenU, pool.address);
                let balance0TS = await getTotalSupply();
                let balance0TP = await getTotalPoolBalance();

                let unutilized0 = await pool.totalUnutilized(tokenP);
                let utilized0 = await pool.totalUtilized(tokenP);

                let liquidity = calculateRemoveLiquidity(
                    inTokenPULP,
                    balance0TS,
                    balance0TP
                );

                if (balance0P.lt(inTokenPULP)) {
                    return;
                }

                console.log("[INITIALSTATE]");
                console.log("ALICE U", balance0U.toString());
                console.log("ALICE P", balance0P.toString());
                console.log("ALICE WITHDRAW", inTokenPULP.toString());
                console.log("CONTRACT U", balance0CU.toString());
                console.log("CONTRACT S", balance0CS.toString());
                console.log("CONTRACT R", balance0R.toString());
                console.log("CONTRACT RU", balance0RinU.toString());
                console.log("CONTRACT TS", balance0TS.toString());
                console.log("CONTRACT TP", balance0TP.toString());
                console.log("WITHDRAW LIQUIDITY", liquidity.toString());
                console.log("CONTRACT UTILIZED", utilized0.toString());
                console.log("CONTRACT UNUTILIZED", unutilized0.toString());

                let event = await pool.withdraw(inTokenPULP, {
                    from: Alice,
                });

                truffleAssert.eventEmitted(event, "Withdraw", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.inTokenPULP.toString()).to.be.eq(
                            inTokenPULP.toString()
                        )
                    );
                });

                let balance1U = await getBalance(_tokenU, Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1CU = await getBalance(_tokenU, pool.address);
                let balance1TS = await getTotalSupply();
                let balance1TP = await getTotalPoolBalance();
                let balance1R = await getTokenBalance(redeem, pool.address);
                let balance1RinU = balance1R
                    .mul(new BN(base))
                    .div(new BN(price));
                let balance1CS = await getBalance(_tokenS, pool.address);
                let unutilized1 = await pool.totalUnutilized(tokenP);
                let utilized1 = await pool.totalUtilized(tokenP);

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaTS = balance1TS.sub(balance0TS);
                let deltaTP = balance1TP.sub(balance0TP);

                console.log("[ENDSTATE]");
                console.log("ALICE U", balance1U.toString());
                console.log("ALICE P", balance1P.toString());
                console.log("ALICE WITHDRAW", inTokenPULP.toString());
                console.log("CONTRACT U", balance1CU.toString());
                console.log("CONTRACT S", balance1CS.toString());
                console.log("CONTRACT R", balance1R.toString());
                console.log("CONTRACT RU", balance1RinU.toString());
                console.log("CONTRACT TS", balance1TS.toString());
                console.log("CONTRACT TP", balance1TP.toString());
                console.log("WITHDRAW LIQUIDITY", liquidity.toString());
                console.log("CONTRACT UTILIZED", utilized1.toString());
                console.log("CONTRACT UNUTILIZED", unutilized1.toString());
                console.log("DELTA ACTUAL", deltaTP.toString());

                let slippage = new BN(50);
                let maxValue = liquidity.add(liquidity.div(slippage));
                let minValue = liquidity.sub(liquidity.div(slippage));
                console.log("[MAXVALUE]", maxValue.toString());
                console.log("[LIQUIDITY]", liquidity.toString());
                console.log("[MINVALUE]", minValue.toString());
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

        it("should revert if inTokenU is above the user's balance", async function() {
            await truffleAssert.reverts(
                pool.withdraw(MILLION_ETHER),
                ERR_BAL_PULP
            );
        });

        it("should revert if inTokenU is 0", async function() {
            await truffleAssert.reverts(pool.withdraw(0), ERR_BAL_PULP);
        });

        it("should withdraw tokenU by burning tokenPULP", async function() {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            await run(1);
        });
    });

    describe("buy", function() {
        before(async () => {
            if (id !== 999) this.skip();
            buy = async (inTokenS) => {
                inTokenS = new BN(inTokenS);
                let balance0U = await getBalance(_tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0Prime = await getTokenBalance(prime, Alice);
                let balance0S = await getBalance(_tokenS, Alice);
                let balance0CU = await getBalance(_tokenU, pool.address);
                let balance0TS = await getTotalSupply();
                let balance0TP = await getTotalPoolBalance();

                let outTokenU = inTokenS.mul(new BN(base)).div(new BN(price));
                let premium = await getPremium();
                premium = premium.mul(inTokenS).div(new BN(toWei("1")));

                if (balance0S.lt(inTokenS)) {
                    return;
                }

                if (balance0CU.lt(outTokenU)) {
                    return;
                }

                let event = await pool.buy(inTokenS, {
                    from: Alice,
                });

                truffleAssert.eventEmitted(event, "Buy", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.inTokenS.toString()).to.be.eq(
                            inTokenS.toString()
                        ) &&
                        expect(ev.outTokenU.toString()).to.be.eq(
                            outTokenU.toString()
                        )
                    );
                });

                let balance1U = await getBalance(_tokenU, Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1Prime = await getTokenBalance(prime, Alice);
                let balance1S = await getBalance(_tokenS, Alice);
                let balance1CU = await getBalance(_tokenU, pool.address);
                let balance1TS = await getTotalSupply();
                let balance1TP = await getTotalPoolBalance();

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaS = balance1S.sub(balance0S);
                let deltaPrime = balance1Prime.sub(balance0Prime);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaTS = balance1TS.sub(balance0TS);
                let deltaTP = balance1TP.sub(balance0TP);

                assertBNEqual(deltaU, premium.neg());
                assertBNEqual(deltaP, new BN(0));
                assertBNEqual(deltaPrime, outTokenU);
                assertBNEqual(deltaS, new BN(0));
                assertBNEqual(deltaCU, outTokenU.neg().iadd(premium));
                assertBNEqual(deltaTS, new BN(0));
            };
        });

        it("should revert if inTokenU is 0", async function() {
            await truffleAssert.reverts(pool.buy(0), "ERR_ZERO");
        });

        it("should revert if inTokenU is greater than the pool's balance", async function() {
            await truffleAssert.reverts(
                pool.buy(MILLION_ETHER),
                ERR_BAL_UNDERLYING
            );
        });

        it("should buy tokenP by paying some premium of tokenU", async function() {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await buy(amt);
                }
            };

            await run(2);
        });
    });

    describe("sell", function() {
        before(async () => {
            if (id !== 999) this.skip();
            sell = async (inTokenP) => {
                inTokenP = new BN(inTokenP);
                let balance0U = await getBalance(_tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0Prime = await getTokenBalance(prime, Alice);
                let balance0S = await getBalance(_tokenS, Alice);
                let balance0R = await getTokenBalance(redeem, pool.address);
                let balance0CU = await getBalance(_tokenU, pool.address);
                let balance0TS = await getTotalSupply();
                let balance0TP = await getTotalPoolBalance();

                let premium = await getPremium();
                premium = premium.mul(inTokenP).div(new BN(toWei("1")));

                if (balance0Prime.lt(inTokenP)) {
                    return;
                }

                if (balance0CU.lt(premium)) {
                    return;
                }

                console.log("[INITIALSTATE]");
                console.log("ALICE U", balance0U.toString());
                console.log("ALICE P", balance0P.toString());
                console.log("ALICE SELL", inTokenP.toString());
                console.log("CONTRACT U", balance0CU.toString());
                console.log("CONTRACT R", balance0R.toString());
                console.log("CONTRACT TS", balance0TS.toString());
                console.log("CONTRACT TP", balance0TP.toString());
                console.log("ESTIMATED PREMIUM", premium.toString());

                let event = await pool.sell(inTokenP, {
                    from: Alice,
                });

                truffleAssert.eventEmitted(event, "Sell", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.inTokenP.toString()).to.be.eq(
                            inTokenP.toString()
                        )
                    );
                });

                let balance1U = await getBalance(_tokenU, Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1Prime = await getTokenBalance(prime, Alice);
                let balance1R = await getTokenBalance(redeem, pool.address);
                let balance1S = await getBalance(_tokenS, Alice);
                let balance1CU = await getBalance(_tokenU, pool.address);
                let balance1TS = await getTotalSupply();
                let balance1TP = await getTotalPoolBalance();

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaS = balance1S.sub(balance0S);
                let deltaR = balance1R.sub(balance0R);
                let deltaPrime = balance1Prime.sub(balance0Prime);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaTS = balance1TS.sub(balance0TS);

                console.log("[ENDSTATE]");
                console.log("ALICE U", balance1U.toString());
                console.log("ALICE P", balance1P.toString());
                console.log("ALICE SELL", inTokenP.toString());
                console.log("CONTRACT U", balance1CU.toString());
                console.log("CONTRACT R", balance1R.toString());
                console.log("CONTRACT TS", balance1TS.toString());
                console.log("CONTRACT TP", balance1TP.toString());
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

        it("should revert if inTokenP is 0", async function() {
            await truffleAssert.reverts(pool.sell(0), ERR_BAL_PRIME);
        });

        it("should revert if inTokenP is greater than the user's balance", async function() {
            await truffleAssert.reverts(
                pool.sell(MILLION_ETHER),
                ERR_BAL_PRIME
            );
        });

        it("should sell tokenP by paying some premium of tokenU", async function() {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await sell(amt);
                }
            };

            await run(2);
        });
    });

    describe("Trader.exercise()", function() {
        it("utilize the rest of the pool", async function() {
            if (id !== 999) this.skip();
            let balanceCU = new BN(
                await _tokenU.methods.balanceOf(pool.address).call()
            );
            let toCover = balanceCU
                .mul(new BN(toWei("1")))
                .div(await prime.base());
            await pool.buy(toCover, {
                from: Alice,
            });
        });

        it("should exercise the options so the pool can redeem them in withdraw", async function() {
            if (id !== 999) this.skip();
            await trader.safeExercise(
                prime.address,
                await prime.balanceOf(Alice),
                Alice
            );
        });
    });

    describe("Pool.withdraw()", function() {
        before(function() {
            if (id !== 999) this.skip();
        });
        it("should revert if inTokenU is above the user's balance", async function() {
            await truffleAssert.reverts(
                pool.withdraw(MILLION_ETHER),
                ERR_BAL_PULP
            );
        });

        it("should revert if inTokenU is 0", async function() {
            await truffleAssert.reverts(pool.withdraw(0), ERR_BAL_PULP);
        });

        it("should withdraw tokenU by burning tokenPULP", async function() {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(ONE_ETHER * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            await run(2);
        });

        it("should withdraw the remaining assets from the pool", async function() {
            await withdraw(await pool.totalSupply(), { from: Alice });
            let totalSupply = await getTotalSupply();
            let totalPoolBalance = await getTotalPoolBalance();
            assertBNEqual(totalSupply, new BN(0));
            assertBNEqual(totalPoolBalance, new BN(0));
        });
    });

    describe("Run Transactions", function() {
        before(function() {
            if (id !== 999) this.skip();
        });
        it("should be able to deposit, withdraw, and buy fluidly", async function() {
            let balanceContract = new BN(
                await _tokenU.methods.balanceOf(pool.address).call()
            );

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
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await buy(amt);
                }
            };

            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    await runDeposit(i);
                    await runBuy(i);
                    if (new BN(await prime.balanceOf(Alice)).gt(new BN(0))) {
                        await trader.safeExercise(
                            prime.address,
                            await prime.balanceOf(Alice),
                            Alice
                        );
                    }
                    await runWithdraw(i);
                }
            };

            await run(3);
            let balanceContractEnd = new BN(
                await _tokenU.methods.balanceOf(pool.address).call()
            );
            console.log(
                fromWei(balanceContract),
                fromWei(balanceContractEnd),
                fromWei(await pool.totalSupply())
            );
        });
    });
});
