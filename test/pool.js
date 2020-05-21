const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const chai = require("chai");
const BN = require("bn.js");
chai.use(require("chai-bn")(BN));
const Dai = artifacts.require("DAI");
const Weth = artifacts.require("WETH9");
const Factory = artifacts.require("Factory");
const FactoryRedeem = artifacts.require("FactoryRedeem");
const PrimeOption = artifacts.require("PrimeOption");
const PrimePool = artifacts.require("PrimePool");
const PrimeTrader = artifacts.require("PrimeTrader");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const PrimeOracle = artifacts.require("PrimeOracle");
const UniFactoryLike = artifacts.require("UniFactoryLike");
const UniExchangeLike = artifacts.require("UniExchangeLike");
const UniFactory = artifacts.require("UniFactory");
const UniExchange = artifacts.require("UniExchange");
const OracleLike = artifacts.require("OracleLike");

// constant imports
const common_constants = require("./constants");
const {
    ERR_BAL_UNDERLYING,
    ERR_BAL_PULP,
    ERR_BAL_PRIME,
    ERR_ZERO_LIQUIDITY,
    ERR_PAUSED,
    HUNDRETH,
    TENTH,
    ONE_ETHER,
    FIVE_ETHER,
    TEN_ETHER,
    HUNDRED_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
    MAINNET_DAI,
    MAINNET_ORACLE,
    MAINNET_WETH,
    MAINNET_UNI_FACTORY,
    MAX_SLIPPAGE,
} = common_constants;

const LOG_VERBOSE = false;
const LOG_VOL = false;

contract("Pool", (accounts) => {
    // WEB3
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;

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
        oracleLike,
        factoryOption,
        factoryRedeem;

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
        let zero = new BN(0);
        if (totalBalance.isZero() || totalSupply.isZero()) {
            return zero;
        }
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

    before(async () => {
        // init tokens
        weth = await Weth.new();
        dai = await Dai.new(MILLION_ETHER);

        // init option factory
        factoryOption = await Factory.new();
        factoryRedeem = await FactoryRedeem.new(factoryOption.address);
        await factoryOption.initialize(factoryRedeem.address);

        // init factory
        let initExchange = await UniExchange.new();
        factory = await UniFactory.new();
        await factory.initializeFactory(initExchange.address);

        // init exchange
        await factory.createExchange(dai.address);
        const exchangeAddress = await factory.getExchange(dai.address);
        exchange = await UniExchange.at(exchangeAddress);

        // init liquidity
        await dai.approve(exchange.address, MILLION_ETHER, { from: Alice });
        await exchange.addLiquidity(1, toWei("100000"), 1604275200, {
            from: Alice,
            value: toWei("250"),
        });
        await dai.mint(Alice, toWei("1000"));

        // init oracle
        oracleLike = await OracleLike.new();
        await oracleLike.setUnderlyingPrice(5e15);

        await weth.deposit({
            from: Alice,
            value: FIVE_ETHER,
        });
        await weth.deposit({
            from: Bob,
            value: FIVE_ETHER,
        });

        /* _tokenU = dai;
        _tokenS = weth;
        tokenU = _tokenU.address;
        tokenS = _tokenS.address;
        marketId = 1;
        poolName = "ETH Short Put Pool LP";
        poolSymbol = "PULP";
        optionName = "ETH Put 200 DAI Expiring May 30 2020";
        optionSymbol = "PRIME";
        redeemName = "ETH Put Redeemable Token";
        redeemSymbol = "REDEEM";
        base = toWei("200");
        price = toWei("1");
        expiry = "1590868800"; // May 30, 2020, 8PM UTC */
        _tokenU = weth;
        _tokenS = dai;
        tokenU = _tokenU.address;
        tokenS = _tokenS.address;
        marketId = 1;
        poolName = "ETH Short Call Pool LP";
        poolSymbol = "PULP";
        optionName = "ETH Call 300 DAI Expiring June 26 2020";
        optionSymbol = "PRIME";
        redeemName = "ETH Call Redeemable Token";
        redeemSymbol = "REDEEM";
        base = toWei("1");
        price = toWei("300");
        expiry = "1593129600"; // June 26, 2020, 0:00:00 UTC

        trader = await PrimeTrader.new(weth.address);
        createPrime = async () => {
            await factoryOption.deployOption(
                tokenU,
                tokenS,
                base,
                price,
                expiry
            );
            let id = await factoryOption.getId(
                tokenU,
                tokenS,
                base,
                price,
                expiry
            );
            let prime = await PrimeOption.at(await factoryOption.options(id));
            return prime;
        };

        prime = await createPrime();
        tokenP = prime.address;
        tokenR = await prime.tokenR();
        redeem = await PrimeRedeem.at(tokenR);

        // Setup prime oracle and feed for dai.
        oracle = await PrimeOracle.new(oracleLike.address, weth.address);
        await oracle.addFeed(dai.address);

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

        getVolatilityProxy = async () => {
            let vol = await pool.calculateVolatilityProxy(tokenP);
            let utilized = await pool.totalUtilized(tokenP);
            let unutilized = await pool.totalUnutilized(tokenP);
            let totalPoolBalance = await pool.totalPoolBalance(tokenP);
            let balanceU = await _tokenU.balanceOf(pool.address);
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
        it("should return the correct name", async () => {
            expect(await pool.name()).to.be.eq(poolName);
        });

        it("should return the correct symbol", async () => {
            expect(await pool.symbol()).to.be.eq(poolSymbol);
        });

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
                factory.address.toUpperCase()
            );
        });
        it("should return the initialized volatility", async () => {
            expect((await pool.volatility()).toString()).to.be.eq("100");
        });
        it("check volatility", async () => {
            await getVolatilityProxy();
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

        it("should revert swap function call while paused contract", async () => {
            await truffleAssert.reverts(
                pool.depositEth({ value: ONE_ETHER }),
                ERR_PAUSED
            );
        });

        it("should unpause contract", async () => {
            await pool.kill();
            assert.equal(await pool.paused(), false);
        });
    });

    describe("deposit", () => {
        before(async () => {
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
                await getVolatilityProxy();
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

        it("should revert if inTokenU is below the min liquidity", async () => {
            await truffleAssert.reverts(pool.deposit(1), ERR_BAL_UNDERLYING);
        });
        it("should revert if inTokenU is above the user's balance", async () => {
            await truffleAssert.reverts(
                pool.deposit(MILLION_ETHER),
                ERR_BAL_UNDERLYING
            );
        });

        // interesting, depositing the min liquidity breaks the next tests (this is a single state pool)
        /* it("should revert if outTokenPULP is 0", async () => {
            await _tokenU.mint(Alice, THOUSAND_ETHER);
            await _tokenU.transfer(pool.address, THOUSAND_ETHER, {
                from: Alice,
            });
            let min = await pool.MIN_LIQUIDITY();
            await pool.deposit(min);
            await truffleAssert.reverts(pool.deposit(min), ERR_ZERO_LIQUIDITY);
        });
 */
        it("should revert on depositEth if tokenU is not WETH", async () => {
            let symbol = await _tokenU.symbol();
            if (symbol != "WETH") {
                await truffleAssert.reverts(
                    pool.depositEth({ value: ONE_ETHER }),
                    "ERR_NOT_WETH"
                );
            }
        });
        it("check volatility", async () => {
            await getVolatilityProxy();
        });

        it("should deposit tokenU and receive tokenPULP", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(TEN_ETHER * Math.random()).toString();
                    await deposit(amt);
                }
            };

            await run(1);
        });
    });

    describe("withdraw", () => {
        before(async () => {
            withdraw = async (inTokenPULP) => {
                inTokenPULP = new BN(inTokenPULP);
                let balance0U;
                if (tokenU == weth.address) {
                    balance0U = await getEthBalance(Alice);
                } else {
                    balance0U = await getBalance(_tokenU, Alice);
                }

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

                let balance1U;
                if (tokenU == weth.address) {
                    balance1U = await getEthBalance(Alice);
                } else {
                    balance1U = await getBalance(_tokenU, Alice);
                }

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
                let gas;
                if (tokenU == weth.address) {
                    gas = new BN(toWei("0.001"));
                }
                let maxValue = liquidity.add(liquidity.div(slippage));
                let minValue = liquidity.sub(liquidity.div(slippage)).sub(gas);
                if (LOG_VERBOSE) console.log("[MAXVALUE]", maxValue.toString());
                if (LOG_VERBOSE)
                    console.log("[LIQUIDITY]", liquidity.toString());
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

        /* it("should revert if outTokenU is 0 but the balanceU is greater than 0", async () => {
            await _tokenU.mint(Alice, THOUSAND_ETHER);
            await pool.deposit(THOUSAND_ETHER);
            await _tokenU.mint(Alice, THOUSAND_ETHER);
            await _tokenU.transfer(pool.address, THOUSAND_ETHER);
            await truffleAssert.reverts(pool.withdraw(1), ERR_BAL_UNDERLYING);
        });

        it("should revert if removing liquidity and maxdraw is less than required draw", async () => {
            await _tokenU.mint(Alice, THOUSAND_ETHER);
            await pool.deposit(THOUSAND_ETHER);
            await truffleAssert.reverts(pool.withdraw(1), ERR_BAL_UNDERLYING);
        }); */

        it("should withdraw tokenU by burning tokenPULP", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            await run(1);
        });
    });

    describe("buy", () => {
        before(async () => {
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
                await getVolatilityProxy();
                let event = await pool.buy(inTokenS, {
                    from: Alice,
                });
                await getVolatilityProxy();
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
        before(async () => {
            sell = async (inTokenP) => {
                inTokenP = new BN(inTokenP);
                let balance0U = await getBalance(_tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0Prime = await getTokenBalance(prime, Alice);
                let balance0S = await getBalance(_tokenS, Alice);
                let balance0R = await getBalance(redeem, pool.address);
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

                let balance1U = await getBalance(_tokenU, Alice);
                let balance1P = await getTokenBalance(pool, Alice);
                let balance1Prime = await getTokenBalance(prime, Alice);
                let balance1R = await getBalance(redeem, pool.address);
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
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await sell(amt);
                }
            };

            await run(5);
        });
    });

    describe("Trader.exercise()", () => {
        it("check volatility", async () => {
            await getVolatilityProxy();
        });
        it("utilize the rest of the pool", async () => {
            if (tokenU == weth.address) {
                await _tokenU.deposit({ from: Alice, value: toWei("300") });
            }
            await pool.deposit(TEN_ETHER, { from: Alice });
            let balanceCU = new BN(await _tokenU.balanceOf(pool.address));
            let toCover = balanceCU
                .mul(await prime.price())
                .div(await prime.base())
                .sub(new BN(toWei("0.001"))); // error in division
            await pool.buy(toCover, {
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
    });

    describe("calculateVolatilityProxy", () => {
        it("check volatility", async () => {
            await getVolatilityProxy();
        });
    });

    describe("Pool.withdraw()", () => {
        it("should revert if inTokenU is above the user's balance", async () => {
            await truffleAssert.reverts(
                pool.withdraw(MILLION_ETHER),
                ERR_BAL_PULP
            );
        });

        it("should revert if inTokenU is 0", async () => {
            await truffleAssert.reverts(pool.withdraw(0), ERR_BAL_PULP);
        });

        it("should withdraw tokenU by burning tokenPULP", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(TENTH * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            await run(2);
        });

        it("should withdraw the remaining assets from the pool", async () => {
            let maxDraw = new BN(await prime.maxDraw());
            if (maxDraw.eq(new BN(0))) {
                return;
            }
            await withdraw(await pool.totalSupply(), { from: Alice });
            let totalSupply = await getTotalSupply();
            let totalPoolBalance = await getTotalPoolBalance();
            assertBNEqual(totalSupply, new BN(0));
            assertBNEqual(totalPoolBalance, new BN(0));
        });
    });

    describe("Run Transactions", () => {
        it("should be able to deposit, withdraw, and buy fluidly", async () => {
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

            const runSell = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await sell(amt);
                }
            };

            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    await getVolatilityProxy();
                    await runDeposit(i);
                    await runBuy(i);
                    if (new BN(await prime.balanceOf(Alice)).gt(new BN(0))) {
                        await trader.safeExercise(
                            prime.address,
                            await prime.balanceOf(Alice),
                            Alice
                        );
                    }
                    await runBuy(i);
                    await runSell(i);
                    await runWithdraw(i);
                    await getVolatilityProxy();
                }
            };

            await run(10);
        });
    });

    describe("depositEth", () => {
        before(async () => {
            _tokenU = weth;
            _tokenS = dai;
            tokenU = _tokenU.address;
            tokenS = _tokenS.address;
            trader = await PrimeTrader.new(weth.address);

            prime = await createPrime();
            tokenP = prime.address;
            tokenR = await prime.tokenR();
            redeem = await PrimeRedeem.at(tokenR);

            // Setup prime oracle and feed for dai.
            oracle = await PrimeOracle.new(oracleLike.address, weth.address);
            await oracle.addFeed(tokenU);
            await oracle.addFeed(tokenS);

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
                let balance1CU = await getBalance(_tokenU, pool.address);
                let balance1TS = await getTotalSupply();
                let balance1TP = await getTotalPoolBalance();

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaTS = balance1TS.sub(balance0TS);
                let deltaTP = balance1TP.sub(balance0TP);

                /* assertBNEqual(deltaU, inTokenU.neg()); */
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
            await _tokenU.deposit({ from: Alice, value: HUNDRED_ETHER });
            await _tokenU.transfer(pool.address, HUNDRED_ETHER, {
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
    });

    /* describe("hegic-like exploit", () => {
        before(async () => {
            _tokenU = weth;
            _tokenS = dai;
            tokenU = _tokenU.address;
            tokenS = _tokenS.address;
            trader = await PrimeTrader.new(weth.address);
            base = toWei("1");
            price = toWei("2");

            prime = await createPrime();
            tokenP = prime.address;
            tokenR = await prime.tokenR();
            redeem = await PrimeRedeem.at(tokenR);

            // Setup prime oracle and feed for dai.
            oracle = await PrimeOracle.new(oracleLike.address, weth.address);
            await oracleLike.setUnderlyingPrice((2e18).toString());
            await oracle.addFeed(tokenU);
            await oracle.addFeed(tokenS);

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

            let startEthAlice = await web3.eth.getBalance(Alice);
            let startEthBob = await web3.eth.getBalance(Bob);
            let startUAlice = await _tokenU.balanceOf(Alice);
            let startUBob = await _tokenU.balanceOf(Bob);
            let startSAlice = await _tokenS.balanceOf(Alice);
            let startSBob = await _tokenS.balanceOf(Bob);
            let startPAlice = await prime.balanceOf(Alice);
            let startPBob = await prime.balanceOf(Bob);
            let startPULPAlice = await pool.balanceOf(Alice);
            let startPULPBob = await pool.balanceOf(Bob);
            let startExchangeDAI = await _tokenS.balanceOf(exchange.address);
            let startExchangeETH = await web3.eth.getBalance(exchange.address);

            console.log("=== STARTING BALANCES ===");
            console.log("Alice Eth:", fromWei(startEthAlice));
            console.log("Bob Eth:", fromWei(startEthBob));
            console.log("Alice U:", fromWei(startUAlice));
            console.log("Bob U:", fromWei(startUBob));
            console.log("Alice S:", fromWei(startSAlice));
            console.log("Bob S:", fromWei(startSBob));
            console.log("Alice P:", fromWei(startPAlice));
            console.log("Bob P:", fromWei(startPBob));
            console.log("Alice PULP:", fromWei(startPULPAlice));
            console.log("Bob PULP:", fromWei(startPULPBob));
            console.log("Exchange Eth:", fromWei(startExchangeETH));
            console.log("Exchange Dai", fromWei(startExchangeDAI));
        });

        it("Bob should add initial liquidity to pool", async () => {
            let balanceEth = await web3.eth.getBalance(Bob);
            await pool.depositEth({ from: Bob, value: TEN_ETHER });
            let balanceU = await _tokenU.balanceOf(pool.address);
            console.log("=== VICTIM DEPOSIT ===");
            console.log(
                "[Deposited Eth:]",
                balanceU.toString(),
                fromWei(balanceU)
            );
            let balanceEthAfter = await web3.eth.getBalance(Bob);
            let deltaEth = new BN(balanceEthAfter).sub(new BN(balanceEth));

            console.log(
                "[Bobs Eth Balance Delta:]",
                deltaEth.toString(),
                fromWei(deltaEth)
            );
        });

        it("should have an LP (Alice) deposit a large sum of liquidity", async () => {
            await pool.depositEth({ value: HUNDRED_ETHER });
            let balanceU = await _tokenU.balanceOf(pool.address);
            console.log("=== MALICIOUS DEPOSIT ===");
            console.log(
                "[New ETH Balance:]",
                balanceU.toString(),
                fromWei(balanceU)
            );
        });

        it("Alice should buy a lot of options from the pool", async () => {
            // if total tokenU in pool is 110, we should use most of it.
            let inTokenU = new BN(toWei("105"));
            let inTokenS = inTokenU.mul(new BN(price)).div(new BN(base));
            console.log("=== BUY ===");
            console.log(
                "[inTokenU:]",
                inTokenU.toString(),
                "[inTokenS:]",
                inTokenS.toString()
            );
            // calculate the estimated premium, we need to have enough tokenU to pay it
            let premiumInU = await getPremium();

            let premiumInS = new BN(premiumInU).mul(
                new BN(inTokenS).div(new BN(ONE_ETHER))
            );

            console.log(
                "[premium in tokenU:]",
                premiumInU.toString(),
                fromWei(premiumInU.toString())
            );

            console.log(
                "[total premium to pay:]",
                premiumInS.toString(),
                fromWei(premiumInS.toString())
            );

            // get weth, with a little extra just in case
            await _tokenU.deposit({
                from: Alice,
                value: premiumInS.toString(),
            });
            await pool.buy(inTokenS, { from: Alice });
            let balanceU = await _tokenU.balanceOf(pool.address);
            console.log(
                "[New ETH Balance:]",
                balanceU.toString(),
                fromWei(balanceU)
            );
        });

        it("should withdraw the 'not-locked' liquidity", async () => {
            let unlocked = await _tokenU.balanceOf(pool.address);
            let inTokenPULP = new BN(unlocked)
                .mul(await pool.totalSupply())
                .div(await pool.totalPoolBalance(tokenP));
            let balanceEth = await web3.eth.getBalance(Alice);
            await pool.withdraw(inTokenPULP.toString());
            let balanceU = await _tokenU.balanceOf(pool.address);
            let balanceEthAfter = await web3.eth.getBalance(Alice);
            let deltaEth = new BN(balanceEthAfter).sub(new BN(balanceEth));
            console.log("=== WITHDRAW ===");
            console.log(
                "[New ETH Pool Balance:]",
                balanceU.toString(),
                fromWei(balanceU)
            );

            console.log(
                "[Alice Delta Eth Balance:]",
                deltaEth.toString(),
                fromWei(deltaEth)
            );
        });

        it("should exercise the option", async () => {
            console.log("=== EXERCISE ===");
            let balanceP = await prime.balanceOf(Alice);
            await trader.safeExercise(tokenP, balanceP, Alice);
        });

        it("Bob should withdraw remaining assets", async () => {
            console.log("=== WITHDRAW REMAINING ===");
            let balancePULP = await pool.balanceOf(Bob);
            let balanceU = await web3.eth.getBalance(Bob);
            let balanceS = await _tokenS.balanceOf(Bob);
            let balanceR = await redeem.balanceOf(pool.address);
            //await pool.withdraw(balancePULP, { from: Bob });
            let balanceUAfter = await web3.eth.getBalance(Bob);
            let balanceSAfter = await _tokenS.balanceOf(Bob);
            let balancePULPAfter = await pool.balanceOf(Bob);
            let balanceRAfter = await redeem.balanceOf(pool.address);

            let deltaU = new BN(balanceUAfter).sub(new BN(balanceU));
            let deltaS = new BN(balanceSAfter).sub(new BN(balanceS));
            let deltaPULP = new BN(balanceRAfter).sub(new BN(balanceR));
            let deltaR = new BN(balanceRAfter).sub(new BN(balanceR));

            console.log(
                "[burned LP tokens]",
                balancePULP.toString(),
                fromWei(balancePULP)
            );

            console.log(
                "[Bobs LP token balance]",
                balancePULPAfter.toString(),
                fromWei(balancePULPAfter)
            );

            console.log(
                "[Bobs Eth Balance Delta]",
                deltaU.toString(),
                fromWei(deltaU)
            );

            console.log(
                "[Bobs tokenS Balance Delta]",
                deltaS.toString(),
                fromWei(deltaS)
            );

            console.log(
                "[Bobs PULP Balance Delta]",
                deltaPULP.toString(),
                fromWei(deltaPULP)
            );

            console.log(
                "[Pools redeem balance Delta]",
                deltaR.toString(),
                fromWei(deltaR)
            );
        });

        it("Alice should withdraw remaining assets", async () => {
            console.log("=== WITHDRAW REMAINING ===");
            let balancePULP = await pool.balanceOf(Alice);
            let balanceU = await web3.eth.getBalance(Alice);
            let balanceS = await _tokenS.balanceOf(Alice);
            let balanceR = await redeem.balanceOf(pool.address);
            //await pool.withdraw(balancePULP, { from: Alice });
            let balanceUAfter = await web3.eth.getBalance(Alice);
            let balanceSAfter = await _tokenS.balanceOf(Alice);
            let balancePULPAfter = await pool.balanceOf(Alice);
            let balanceRAfter = await redeem.balanceOf(pool.address);

            let deltaU = new BN(balanceUAfter).sub(new BN(balanceU));
            let deltaS = new BN(balanceSAfter).sub(new BN(balanceS));
            let deltaPULP = new BN(balancePULPAfter).sub(new BN(balancePULP));
            let deltaR = new BN(balanceRAfter).sub(new BN(balanceR));

            console.log(
                "[Alices Eth Balance Delta]",
                deltaU.toString(),
                fromWei(deltaU)
            );

            console.log(
                "[Alices tokenS Balance Delta]",
                deltaS.toString(),
                fromWei(deltaS)
            );

            console.log(
                "[Alices PULP Balance Delta]",
                deltaPULP.toString(),
                fromWei(deltaPULP)
            );
            console.log(
                "[Pools redeem balance Delta]",
                deltaR.toString(),
                fromWei(deltaR)
            );

            console.log(
                "Redeem Total Supply",
                fromWei(await redeem.totalSupply())
            );
            console.log("Total PULP SUPPLY", fromWei(await pool.totalSupply()));
            console.log(
                "Total Pool Balance",
                fromWei(await pool.totalPoolBalance(tokenP))
            );
            let endEthAlice = await web3.eth.getBalance(Alice);
            let endEthBob = await web3.eth.getBalance(Bob);
            let endUAlice = await _tokenU.balanceOf(Alice);
            let endUBob = await _tokenU.balanceOf(Bob);
            let endSAlice = await _tokenS.balanceOf(Alice);
            let endSBob = await _tokenS.balanceOf(Bob);
            let endPAlice = await prime.balanceOf(Alice);
            let endPBob = await prime.balanceOf(Bob);
            let endPULPAlice = await pool.balanceOf(Alice);
            let endPULPBob = await pool.balanceOf(Bob);
            let endExchangeDAI = await _tokenS.balanceOf(exchange.address);
            let endExchangeETH = await web3.eth.getBalance(exchange.address);

            console.log("=== ENDING BALANCES ===");
            console.log("Alice Eth:", fromWei(endEthAlice));
            console.log("Bob Eth:", fromWei(endEthBob));
            console.log("Alice U:", fromWei(endUAlice));
            console.log("Bob U:", fromWei(endUBob));
            console.log("Alice S:", fromWei(endSAlice));
            console.log("Bob S:", fromWei(endSBob));
            console.log("Alice P:", fromWei(endPAlice));
            console.log("Bob P:", fromWei(endPBob));
            console.log("Alice PULP:", fromWei(endPULPAlice));
            console.log("Bob PULP:", fromWei(endPULPBob));
            console.log("Exchange Eth:", fromWei(endExchangeETH));
            console.log("Exchange Dai", fromWei(endExchangeDAI));
        });
    }); */
});
