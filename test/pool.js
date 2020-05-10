const { assert, expect } = require("chai");
const chai = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const daiABI = require("../contracts/test/abi/dai");
const Weth = require("../contracts/test/abi/WETH9.json");
const PrimeOption = artifacts.require("PrimeOption");
const PrimePool = artifacts.require("PrimePool");
const PrimeTrader = artifacts.require("PrimeTrader");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const PrimeOracle = artifacts.require("PrimeOracle");
const UniFactoryLike = artifacts.require("UniFactoryLike");
const UniExchangeLike = artifacts.require("UniExchangeLike");
chai.use(require("chai-bn")(BN));

// constant imports
const common_constants = require("./constants");
const {
    ERR_BAL_UNDERLYING,
    HUNDRETH,
    ONE_ETHER,
    FIVE_ETHER,
    TEN_ETHER,
    MILLION_ETHER,
    TREASURER,
    MAINNET_DAI,
    MAINNET_ORACLE,
    MAINNET_WETH,
    MAINNET_UNI_FACTORY,
} = common_constants;

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
        exchange;

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

    before(async () => {
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

        _tokenU = DAI;
        _tokenS = WETH;
        tokenU = MAINNET_DAI;
        tokenS = MAINNET_WETH;
        marketId = 1;
        poolName = "ETH Short Put Pool LP";
        poolSymbol = "PULP";
        optionName = "ETH Put 200 DAI Expiring May 30 2020";
        optionSymbol = "PRIME";
        redeemName = "ETH Put Redeemable Token";
        redeemSymbol = "REDEEM";
        base = toWei("200");
        price = toWei("1");
        expiry = "1590868800"; // May 30, 2020, 8PM UTC

        trader = await PrimeTrader.new(MAINNET_WETH);
        prime = await PrimeOption.new(
            optionName,
            optionSymbol,
            marketId,
            tokenU,
            tokenS,
            base,
            price,
            expiry
        );
        tokenP = prime.address;
        redeem = await PrimeRedeem.new(
            redeemName,
            redeemSymbol,
            prime.address,
            tokenS
        );
        oracle = await PrimeOracle.new(MAINNET_ORACLE);
        pool = await PrimePool.new(
            MAINNET_WETH,
            prime.address,
            oracle.address,
            MAINNET_UNI_FACTORY,
            poolName,
            poolSymbol
        );
        tokenPULP = pool.address;
        await prime.initTokenR(redeem.address);

        factory = await UniFactoryLike.new(MAINNET_UNI_FACTORY);
        const exchangeAddress = await factory.getExchange(MAINNET_DAI);
        exchange = await UniExchangeLike.new(exchangeAddress);

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
                await pool.volatility(),
                await prime.base(),
                await prime.price(),
                await prime.expiry()
            );
            premium = new BN(premium);
            return premium;
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
                MAINNET_WETH.toUpperCase()
            );
        });

        it("should return the correct oracle address", async () => {
            expect((await pool.oracle()).toString().toUpperCase()).to.be.eq(
                oracle.address.toUpperCase()
            );
        });
        it("should return the correct tokenS address", async () => {
            expect((await pool.WETH()).toString().toUpperCase()).to.be.eq(
                (await prime.tokenS()).toUpperCase()
            );
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

        it("should revert if inTokenU is below the min liquidity", async () => {
            await truffleAssert.reverts(pool.deposit(1), ERR_BAL_UNDERLYING);
        });
        it("should revert if inTokenU is above the user's balance", async () => {
            await truffleAssert.reverts(
                pool.deposit(MILLION_ETHER),
                ERR_BAL_UNDERLYING
            );
        });

        it("should deposit tokenU and receive tokenPULP", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(TEN_ETHER * Math.random()).toString();
                    await deposit(amt);
                }
            };

            await run(2);
        });
    });

    describe("withdraw", () => {
        before(async () => {
            withdraw = async (inTokenPULP) => {
                inTokenPULP = new BN(inTokenPULP);
                let balance0U = await getBalance(_tokenU, Alice);
                let balance0P = await getTokenBalance(pool, Alice);
                let balance0CU = await getBalance(_tokenU, pool.address);
                let balance0TS = await getTotalSupply();
                let balance0TP = await getTotalPoolBalance();

                let liquidity = calculateRemoveLiquidity(
                    inTokenPULP,
                    balance0TS,
                    balance0TP
                );

                if (balance0U.lt(inTokenPULP)) {
                    return;
                }

                let event = await pool.withdraw(inTokenPULP, {
                    from: Alice,
                });

                truffleAssert.eventEmitted(event, "Withdraw", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.inTokenPULP.toString()).to.be.eq(
                            inTokenPULP.toString()
                        ) &&
                        expect(ev.outTokenU.toString()).to.be.eq(
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

                assertBNEqual(deltaU, liquidity);
                assertBNEqual(deltaP, inTokenPULP.neg());
                assertBNEqual(deltaTS, inTokenPULP.neg());
                assertBNEqual(deltaTP, liquidity.neg());
            };
        });

        it("should revert if inTokenU is above the user's balance", async () => {
            await truffleAssert.reverts(
                pool.withdraw(MILLION_ETHER),
                "ERR_BAL_PULP"
            );
        });

        it("should revert if inTokenU is 0", async () => {
            await truffleAssert.reverts(pool.withdraw(0), "ERR_BAL_PULP");
        });

        it("should withdraw tokenU by burning tokenPULP", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            await run(2);
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

                if (balance0U.lt(inTokenS)) {
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
                        ) &&
                        expect(ev.premium.toString()).to.be.eq(
                            premium.toString()
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

                assertBNEqual(deltaU, outTokenU.neg());
                assertBNEqual(deltaP, new BN(0));
                assertBNEqual(deltaPrime, outTokenU);
                assertBNEqual(deltaS, new BN(0));
                assertBNEqual(deltaCU, outTokenU.neg().iadd(premium));
                assertBNEqual(deltaTS, new BN(0));
                assertBNEqual(deltaTP, new BN(0));
            };
        });

        it("should revert if inTokenU is 0", async () => {
            await truffleAssert.reverts(pool.buy(0), "ERR_ZERO");
        });

        it("should revert if inTokenU is greater than the pool's balance", async () => {
            await truffleAssert.reverts(
                pool.buy(MILLION_ETHER),
                "ERR_BAL_UNDERLYING"
            );
        });

        it("should buy tokenP by paying some premium of tokenU", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    console.log("[BUY() Test RUN #]", i);
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await buy(amt);
                }
            };

            await run(2);
        });
    });

    describe("Trader.exercise()", () => {
        it("utilize the rest of the pool", async () => {
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

        it("should exercise the options so the pool can redeem them in withdraw", async () => {
            await trader.safeSwap(
                prime.address,
                await prime.balanceOf(Alice),
                Alice
            );
        });
    });

    describe("Pool.withdraw()", () => {
        it("should revert if inTokenU is above the user's balance", async () => {
            await truffleAssert.reverts(
                pool.withdraw(MILLION_ETHER),
                "ERR_BAL_PULP"
            );
        });

        it("should revert if inTokenU is 0", async () => {
            await truffleAssert.reverts(pool.withdraw(0), "ERR_BAL_PULP");
        });

        it("should withdraw tokenU by burning tokenPULP", async () => {
            const run = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(ONE_ETHER * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            await run(2);
        });

        it("should withdraw the remaining assets from the pool", async () => {
            /* await pool.withdraw(await pool.totalSupply(), {
                from: Alice,
            }); */

            await withdraw(await pool.totalSupply(), { from: Alice });
            let totalSupply = await getTotalSupply();
            let totalPoolBalance = await getTotalPoolBalance();
            assertBNEqual(totalSupply, new BN(0));
            assertBNEqual(totalPoolBalance, new BN(0));
        });
    });

    describe("Run Transactions", () => {
        it("should be able to deposit, withdraw, and buy fluidly", async () => {
            let balanceContract = new BN(
                await _tokenU.methods.balanceOf(pool.address).call()
            );

            /* const deposit = async (amount) => {
                let balance0U = new BN(
                    await _tokenU.methods.balanceOf(Alice).call()
                );
                let balance0P = new BN(await pool.balanceOf(Alice));
                let balance0CU = new BN(
                    await _tokenU.methods.balanceOf(pool.address).call()
                );
                let balance0CP = new BN(await pool.totalSupply());

                if (balance0U.lt(new BN(amount))) {
                    return;
                }

                let expectedP = calculateAddLiquidity(
                    amount,
                    await pool.totalSupply(),
                    await pool.totalPoolBalance(prime.address)
                );

                let depo = await pool.deposit(amount, {
                    from: Alice,
                });
                truffleAssert.eventEmitted(depo, "Deposit");

                let balance1U = new BN(
                    await _tokenU.methods.balanceOf(Alice).call()
                );
                let balance1P = new BN(await pool.balanceOf(Alice));
                let balance1CU = new BN(
                    await _tokenU.methods.balanceOf(pool.address).call()
                );
                let balance1CP = new BN(await pool.totalSupply());

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaCP = balance1CP.sub(balance0CP);

                assertBNEqual(deltaU, -amount);
                assertBNEqual(deltaP, expectedP);
                assertBNEqual(deltaCU, +amount);
                assertBNEqual(deltaCP, expectedP);
            }; */

            const runDeposit = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(TEN_ETHER * Math.random()).toString();
                    await deposit(amt);
                }
            };

            /* const withdraw = async (amount) => {
                let balance0U = new BN(
                    await _tokenU.methods.balanceOf(Alice).call()
                );
                let balance0P = new BN(await pool.balanceOf(Alice));
                let balance0S = new BN(
                    await _tokenS.methods.balanceOf(prime.address).call()
                );
                let balance0CU = new BN(
                    await _tokenU.methods.balanceOf(pool.address).call()
                );
                let balance0CP = new BN(await pool.totalSupply());

                if (balance0P.lt(new BN(amount))) {
                    return;
                }

                let expectedU = calculateRemoveLiquidity(
                    amount,
                    await pool.totalSupply(),
                    await pool.totalPoolBalance(prime.address)
                );

                let draw = await pool.withdraw(amount, {
                    from: Alice,
                });
                truffleAssert.eventEmitted(draw, "Withdraw");

                let balance1U = new BN(
                    await _tokenU.methods.balanceOf(Alice).call()
                );
                let balance1P = new BN(await pool.balanceOf(Alice));
                let balance1S = new BN(
                    await _tokenS.methods.balanceOf(prime.address).call()
                );
                let balance1CU = new BN(
                    await _tokenU.methods.balanceOf(pool.address).call()
                );
                let balance1CP = new BN(await pool.totalSupply());

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaS = balance1S.sub(balance0S);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaCP = balance1CP.sub(balance0CP);

                assertBNEqual(deltaU, expectedU);
                assertBNEqual(deltaP, -amount);
                assertBNEqual(deltaCU, expectedU.neg());
                assertBNEqual(deltaCP, -amount);
            }; */

            const runWithdraw = async (runs) => {
                for (let i = 0; i < runs; i++) {
                    let amt = Math.floor(HUNDRETH * Math.random()).toString();
                    await withdraw(amt);
                }
            };

            /* const buy = async (amount) => {
                let balance0U = new BN(
                    await _tokenU.methods.balanceOf(Alice).call()
                );
                let balance0P = new BN(await prime.balanceOf(Alice));
                let balance0CU = new BN(
                    await _tokenU.methods.balanceOf(pool.address).call()
                );
                let balance0CP = new BN(await prime.totalSupply());
                let premium = await oracle.calculatePremium(
                    tokenU,
                    await pool.volatility(),
                    await prime.base(),
                    await prime.price(),
                    await prime.expiry()
                );

                let expectedU = calculateBuy(
                    amount,
                    await prime.base(),
                    await prime.price(),
                    premium
                );
                premium = new BN(premium);

                let buy = await pool.buy(amount, {
                    from: Alice,
                });
                truffleAssert.eventEmitted(buy, "Buy");

                let balance1U = new BN(
                    await _tokenU.methods.balanceOf(Alice).call()
                );
                let balance1P = new BN(await prime.balanceOf(Alice));
                let balance1CU = new BN(
                    await _tokenU.methods.balanceOf(pool.address).call()
                );
                let balance1CP = new BN(await prime.totalSupply());

                let deltaU = balance1U.sub(balance0U);
                let deltaP = balance1P.sub(balance0P);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaCP = balance1CP.sub(balance0CP);

                assertBNEqual(deltaU, premium.neg());
                let minted = new BN(amount)
                    .mul(await prime.base())
                    .div(new BN(toWei("1")));
                assertBNEqual(deltaP, minted); // needs to account for premium
                assertBNEqual(deltaCU, expectedU.neg()); 
                assertBNEqual(
                    deltaCP,
                    minted
                );
            }; */

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
                        await trader.safeSwap(
                            prime.address,
                            await prime.balanceOf(Alice),
                            Alice
                        );
                    }
                    await runWithdraw(i);
                }
            };

            await run(2);
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
