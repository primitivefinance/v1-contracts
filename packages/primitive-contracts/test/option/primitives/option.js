const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const utils = require("../../lib/utils");
const setup = require("../../lib/setup");
const constants = require("../../lib/constants");
const { toWei, assertBNEqual, verifyOptionInvariants } = utils;
const {
    newERC20,
    newWeth,
    newRegistry,
    newOptionFactory,
    newPrimitive,
    newTestOption,
    newTestRedeem,
    newBadERC20,
} = setup;
const {
    ONE_ETHER,
    FIVE_ETHER,
    FIFTY_ETHER,
    HUNDRED_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
} = constants.VALUES;

const {
    ERR_ZERO,
    ERR_PAUSED,
    ERR_EXPIRED,
    ERR_NOT_VALID,
    ERR_NOT_OWNER,
    ERR_BAL_STRIKE,
    ERR_BAL_UNDERLYING,
} = constants.ERR_CODES;

const { ZERO_ADDRESS } = constants.ADDRESSES;
const OptionTest = artifacts.require("OptionTest");

contract(" Option Contract", (accounts) => {
    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let weth, dai, prime, redeem;
    let tokenU, tokenS;
    let base, quote, expiry;
    let registry, factoryOption, Primitive;

    before(async () => {
        weth = await newWeth();
        dai = await newERC20("TEST DAI", "DAI", MILLION_ETHER);
        registry = await newRegistry();
        factoryOption = await newOptionFactory(registry);

        tokenU = dai;
        tokenS = weth;
        base = toWei("200");
        quote = toWei("1");
        expiry = "1690868800"; // May 30, 2020, 8PM UTC

        Primitive = await newPrimitive(
            registry,
            tokenU,
            tokenS,
            base,
            quote,
            expiry
        );

        prime = Primitive.prime;
        redeem = Primitive.redeem;

        await weth.deposit({ value: FIFTY_ETHER });

        getBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        };

        getCache = async (cache) => {
            switch (cache) {
                case "u":
                    cache = new BN(await prime.cacheU());
                    break;
                case "s":
                    cache = new BN(await prime.cacheS());
                    break;
            }
            return cache;
        };
    });

    describe("Registry", () => {
        it("should get the option", async () => {
            let option = await registry.getOption(
                tokenU.address,
                tokenS.address,
                base,
                quote,
                expiry
            );
            assert.equal(option, prime.address, "Incorrect option address");
        });

        it("reverts if one of the tokens in an option is address zero", async () => {
            await truffleAssert.reverts(
                registry.deployOption(
                    ZERO_ADDRESS,
                    tokenS.address,
                    base,
                    quote,
                    expiry
                ),
                "ERR_ADDRESS"
            );
        });
    });

    describe(" Redeem", () => {
        it("should return the correct controller", async () => {
            assert.equal(
                (await redeem.factory()).toString(),
                registry.address,
                "Incorrect controller"
            );
        });
        it("should return the correct tokenP", async () => {
            assert.equal(
                (await redeem.tokenP()).toString(),
                prime.address,
                "Incorrect tokenP"
            );
        });
        it("should return the correct tokenS", async () => {
            assert.equal(
                (await redeem.underlying()).toString(),
                tokenS.address,
                "Incorrect tokenS"
            );
        });
        it("should revert on mint if msg.sender is not prime contract", async () => {
            await truffleAssert.reverts(redeem.mint(Alice, 10), ERR_NOT_VALID);
        });
        it("should revert on burn if msg.sender is not prime contract", async () => {
            await truffleAssert.reverts(redeem.burn(Alice, 10), ERR_NOT_VALID);
        });
    });
    describe(" Option", () => {
        it("should return the correct tokenU", async () => {
            assert.equal(
                (await prime.tokenU()).toString(),
                tokenU.address,
                "Incorrect tokenU"
            );
        });

        it("should return the correct tokenS", async () => {
            assert.equal(
                (await prime.tokenS()).toString(),
                tokenS.address,
                "Incorrect tokenS"
            );
        });

        it("should return the correct tokenR", async () => {
            assert.equal(
                (await prime.tokenR()).toString(),
                redeem.address,
                "Incorrect tokenR"
            );
        });

        it("should return the correct base", async () => {
            assert.equal(
                (await prime.base()).toString(),
                base,
                "Incorrect base"
            );
        });

        it("should return the correct quote", async () => {
            assert.equal(
                (await prime.quote()).toString(),
                quote,
                "Incorrect quote"
            );
        });

        it("should return the correct expiry", async () => {
            assert.equal(
                (await prime.expiry()).toString(),
                expiry,
                "Incorrect expiry"
            );
        });

        it("should return the correct prime", async () => {
            let result = await prime.getOption();
            assert.equal(
                result._tokenU.toString(),
                tokenU.address,
                "Incorrect expiry"
            );
            assert.equal(
                result._tokenS.toString(),
                tokenS.address,
                "Incorrect expiry"
            );
            assert.equal(
                result._tokenR.toString(),
                redeem.address,
                "Incorrect expiry"
            );
            assert.equal(result._base.toString(), base, "Incorrect expiry");
            assert.equal(result._quote.toString(), quote, "Incorrect expiry");
            assert.equal(result._expiry.toString(), expiry, "Incorrect expiry");
        });

        it("should get the tokens", async () => {
            let result = await prime.getTokens();
            assert.equal(
                result._tokenU.toString(),
                tokenU.address,
                "Incorrect tokenU"
            );
            assert.equal(
                result._tokenS.toString(),
                tokenS.address,
                "Incorrect tokenS"
            );
            assert.equal(
                result._tokenR.toString(),
                redeem.address,
                "Incorrect tokenR"
            );
        });

        it("should get the caches", async () => {
            let result = await prime.getCaches();
            assert.equal(result._cacheU.toString(), "0", "Incorrect cacheU");
            assert.equal(result._cacheS.toString(), "0", "Incorrect cacheS");
        });

        it("should return the correct initial cacheU", async () => {
            assert.equal(
                (await prime.cacheU()).toString(),
                0,
                "Incorrect cacheU"
            );
        });

        it("should return the correct initial cacheS", async () => {
            assert.equal(
                (await prime.cacheS()).toString(),
                0,
                "Incorrect cacheS"
            );
        });

        it("should return the correct initial factory", async () => {
            assert.equal(
                (await prime.factory()).toString(),
                factoryOption.address,
                "Incorrect factory"
            );
        });

        it("should return the correct tokenP for redeem", async () => {
            assert.equal(
                (await redeem.tokenP()).toString(),
                prime.address,
                "Incorrect tokenP"
            );
        });

        it("should return the correct tokenS for redeem", async () => {
            assert.equal(
                (await redeem.underlying()).toString(),
                tokenS.address,
                "Incorrect tokenS"
            );
        });

        it("should return the correct controller for redeem", async () => {
            assert.equal(
                (await redeem.factory()).toString(),
                registry.address,
                "Incorrect factory"
            );
        });

        describe("kill", () => {
            it("revert if msg.sender is not owner", async () => {
                await truffleAssert.reverts(
                    prime.kill({ from: Bob }),
                    ERR_NOT_OWNER
                );
            });

            it("should pause contract", async () => {
                await registry.kill(prime.address);
                assert.equal(await prime.paused(), true);
            });

            it("should revert mint function call while paused contract", async () => {
                await truffleAssert.reverts(prime.mint(Alice), ERR_PAUSED);
            });

            it("should revert swap function call while paused contract", async () => {
                await truffleAssert.reverts(
                    prime.exercise(Alice, 1, []),
                    ERR_PAUSED
                );
            });

            it("should unpause contract", async () => {
                await registry.kill(prime.address);
                assert.equal(await prime.paused(), false);
            });
        });

        describe("initTokenR", () => {
            it("revert if msg.sender is not owner", async () => {
                await truffleAssert.reverts(
                    prime.initTokenR(Alice, { from: Bob }),
                    ERR_NOT_OWNER
                );
            });
        });

        describe("mint", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    tokenU,
                    tokenS,
                    base,
                    quote,
                    expiry
                );

                prime = Primitive.prime;
                redeem = Primitive.redeem;

                mint = async (inTokenU) => {
                    inTokenU = new BN(inTokenU);
                    let outTokenR = inTokenU
                        .mul(new BN(quote))
                        .div(new BN(base));

                    let balanceU = await getBalance(tokenU, Alice);
                    let balanceP = await getBalance(prime, Alice);
                    let balanceR = await getBalance(redeem, Alice);

                    await tokenU.transfer(prime.address, inTokenU, {
                        from: Alice,
                    });
                    let event = await prime.mint(Alice);

                    let deltaU = (await getBalance(tokenU, Alice)).sub(
                        balanceU
                    );
                    let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                    let deltaR = (await getBalance(redeem, Alice)).sub(
                        balanceR
                    );

                    assertBNEqual(deltaU, inTokenU.neg());
                    assertBNEqual(deltaP, inTokenU);
                    assertBNEqual(deltaR, outTokenR);

                    await truffleAssert.eventEmitted(event, "Mint", (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.outTokenP.toString()).to.be.eq(
                                inTokenU.toString()
                            ) &&
                            expect(ev.outTokenR.toString()).to.be.eq(
                                outTokenR.toString()
                            )
                        );
                    });

                    let cacheU = await getCache("u");
                    let cacheS = await getCache("s");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.cacheU.toString()).to.be.eq(
                                cacheU.toString()
                            ) &&
                            expect(ev.cacheS.toString()).to.be.eq(
                                cacheS.toString()
                            )
                        );
                    });
                    await verifyOptionInvariants(tokenU, tokenS, prime, redeem);
                };
            });

            it("revert if no tokens were sent to contract", async () => {
                await truffleAssert.reverts(prime.mint(Alice), ERR_ZERO);
            });

            it("mint tokenP and tokenR to Alice", async () => {
                let inTokenU = ONE_ETHER;
                await mint(inTokenU);
            });

            it("should revert by sending 1 wei of tokenU to tokenP and call mint", async () => {
                let inTokenU = "1";
                await tokenU.transfer(prime.address, inTokenU, {
                    from: Alice,
                });
                await truffleAssert.reverts(prime.mint(Alice), ERR_ZERO);
            });
        });

        describe("exercise", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    tokenU,
                    tokenS,
                    base,
                    quote,
                    expiry
                );

                prime = Primitive.prime;
                redeem = Primitive.redeem;

                exercise = async (inTokenP) => {
                    inTokenP = new BN(inTokenP);
                    let inTokenS = inTokenP
                        .mul(new BN(quote))
                        .div(new BN(base));
                    let fee = inTokenP
                        .div(new BN(1000))
                        .mul(new BN(quote))
                        .div(new BN(base));
                    let outTokenU = inTokenP;

                    let balanceU = await getBalance(tokenU, Alice);
                    let balanceP = await getBalance(prime, Alice);
                    let balanceS = await getBalance(tokenS, Alice);
                    if (tokenU.address == weth.address)
                        await tokenS.deposit({ value: fee.add(inTokenS) });
                    await prime.transfer(prime.address, inTokenP, {
                        from: Alice,
                    });
                    await tokenS.transfer(prime.address, inTokenS.add(fee), {
                        from: Alice,
                    });

                    let event = await prime.exercise(Alice, inTokenP, []);

                    let deltaU = (await getBalance(tokenU, Alice)).sub(
                        balanceU
                    );
                    let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                    let deltaS = (await getBalance(tokenS, Alice)).sub(
                        balanceS
                    );

                    // 1000 = fee
                    assertBNEqual(deltaU, outTokenU);
                    assertBNEqual(deltaP, inTokenP.neg());
                    assertBNEqual(deltaS, inTokenS.add(fee).neg());

                    await truffleAssert.eventEmitted(
                        event,
                        "Exercise",
                        (ev) => {
                            return (
                                expect(ev.from).to.be.eq(Alice) &&
                                expect(ev.outTokenU.toString()).to.be.eq(
                                    outTokenU.toString()
                                ) &&
                                expect(ev.inTokenS.toString()).to.be.eq(
                                    inTokenS.add(fee).toString()
                                )
                            );
                        }
                    );

                    let cacheU = await getCache("u");
                    let cacheS = await getCache("s");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.cacheU.toString()).to.be.eq(
                                cacheU.toString()
                            ) &&
                            expect(ev.cacheS.toString()).to.be.eq(
                                cacheS.toString()
                            )
                        );
                    });
                    await verifyOptionInvariants(tokenU, tokenS, prime, redeem);
                };
            });

            it("revert if 0 tokenU requested to be taken out", async () => {
                await truffleAssert.reverts(
                    prime.exercise(Alice, 0, []),
                    ERR_ZERO
                );
            });

            it("revert if not enough underlying tokens to take", async () => {
                await truffleAssert.reverts(
                    prime.exercise(Alice, ONE_ETHER, []),
                    ERR_BAL_UNDERLYING
                );
            });

            it("reverts if outTokenU > inTokenP, not enough tokenP was sent in", async () => {
                await mint(toWei("0.01"));
                await prime.transfer(prime.address, toWei("0.01"));
                await tokenS.deposit({ from: Alice, value: quote });
                await tokenS.transfer(prime.address, quote);
                await truffleAssert.reverts(
                    prime.exercise(Alice, quote, [], { from: Alice }),
                    ERR_BAL_UNDERLYING
                );
                await prime.take();
            });

            it("reverts if 0 tokenS and 0 tokenU are sent into contract", async () => {
                await mint(FIVE_ETHER);
                await truffleAssert.reverts(
                    prime.exercise(Alice, ONE_ETHER, [], { from: Alice }),
                    ERR_ZERO
                );
            });

            it("should revert because no tokenP were sent to contract", async () => {
                await mint(FIVE_ETHER);
                await tokenS.transfer(prime.address, quote);
                await truffleAssert.reverts(
                    prime.exercise(Alice, ONE_ETHER, [], { from: Alice }),
                    "ERR_BAL_INPUT"
                );
            });

            it("exercises consecutively", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                await tokenS.deposit({ from: Alice, value: quote });
                await exercise(toWei("0.1"));
                await exercise(toWei("0.34521"));

                // Interesting, the two 0s at the end of this are necessary. If they are not 0s, the
                // returned value will be unequal because the accuracy of the mint is only 10^16.
                // This should be verified further.
                await exercise("2323234235200");
            });
        });

        describe("redeem", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    tokenU,
                    tokenS,
                    base,
                    quote,
                    expiry
                );

                prime = Primitive.prime;
                redeem = Primitive.redeem;

                callRedeem = async (inTokenR) => {
                    inTokenR = new BN(inTokenR);
                    let outTokenS = inTokenR;

                    let balanceS = await getBalance(tokenS, Alice);
                    let balanceR = await getBalance(redeem, Alice);

                    await redeem.transfer(prime.address, inTokenR, {
                        from: Alice,
                    });
                    let event = await prime.redeem(Alice);

                    let deltaS = (await getBalance(tokenS, Alice)).sub(
                        balanceS
                    );
                    let deltaR = (await getBalance(redeem, Alice)).sub(
                        balanceR
                    );

                    assertBNEqual(deltaS, outTokenS);
                    assertBNEqual(deltaR, inTokenR.neg());

                    await truffleAssert.eventEmitted(event, "Redeem", (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.inTokenR.toString()).to.be.eq(
                                inTokenR.toString()
                            ) &&
                            expect(ev.inTokenR.toString()).to.be.eq(
                                outTokenS.toString()
                            )
                        );
                    });

                    let cacheU = await getCache("u");
                    let cacheS = await getCache("s");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.cacheU.toString()).to.be.eq(
                                cacheU.toString()
                            ) &&
                            expect(ev.cacheS.toString()).to.be.eq(
                                cacheS.toString()
                            )
                        );
                    });
                    await verifyOptionInvariants(tokenU, tokenS, prime, redeem);
                };
            });

            it("revert if 0 tokenR were sent to contract", async () => {
                await truffleAssert.reverts(prime.redeem(Alice), ERR_ZERO);
            });

            it("reverts if not enough tokenS in prime contract", async () => {
                await mint(toWei("200"));
                await redeem.transfer(prime.address, toWei("1"));
                await truffleAssert.reverts(
                    prime.redeem(Alice, { from: Alice }),
                    ERR_BAL_STRIKE
                );
                await prime.take();
            });

            it("redeems consecutively", async () => {
                let inTokenR = ONE_ETHER;
                let inTokenU = new BN(inTokenR)
                    .mul(new BN(base))
                    .div(new BN(quote));
                await mint(inTokenU);
                await exercise(inTokenU);
                await callRedeem(toWei("0.1"));
                await callRedeem(toWei("0.34521"));
                await callRedeem("23232342352345");
            });
        });

        describe("close", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    tokenU,
                    tokenS,
                    base,
                    quote,
                    expiry
                );

                prime = Primitive.prime;
                redeem = Primitive.redeem;

                close = async (inTokenP) => {
                    inTokenP = new BN(inTokenP);
                    let inTokenR = inTokenP
                        .mul(new BN(quote))
                        .div(new BN(base));
                    let outTokenU = inTokenP;

                    let balanceR = await getBalance(redeem, Alice);
                    let balanceU = await getBalance(tokenU, Alice);
                    let balanceP = await getBalance(prime, Alice);

                    await prime.transfer(prime.address, inTokenP, {
                        from: Alice,
                    });
                    await redeem.transfer(prime.address, inTokenR, {
                        from: Alice,
                    });
                    let event = await prime.close(Alice);

                    let deltaU = (await getBalance(tokenU, Alice)).sub(
                        balanceU
                    );
                    let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                    let deltaR = (await getBalance(redeem, Alice)).sub(
                        balanceR
                    );

                    assertBNEqual(deltaU, outTokenU);
                    assertBNEqual(deltaP, inTokenP.neg());
                    assertBNEqual(deltaR, inTokenR.neg());

                    await truffleAssert.eventEmitted(event, "Close", (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.inTokenP.toString()).to.be.eq(
                                inTokenP.toString()
                            ) &&
                            expect(ev.inTokenP.toString()).to.be.eq(
                                outTokenU.toString()
                            )
                        );
                    });

                    let cacheU = await getCache("u");
                    let cacheS = await getCache("s");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.cacheU.toString()).to.be.eq(
                                cacheU.toString()
                            ) &&
                            expect(ev.cacheS.toString()).to.be.eq(
                                cacheS.toString()
                            )
                        );
                    });
                    await verifyOptionInvariants(tokenU, tokenS, prime, redeem);
                };
            });

            it("revert if 0 tokenR were sent to contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                await prime.transfer(prime.address, inTokenP, { from: Alice });
                await truffleAssert.reverts(prime.close(Alice), ERR_ZERO);
            });

            it("revert if 0 tokenP were sent to contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                let inTokenR = new BN(inTokenP)
                    .mul(new BN(quote))
                    .div(new BN(base));
                await redeem.transfer(prime.address, inTokenR, {
                    from: Alice,
                });
                await truffleAssert.reverts(prime.close(Alice), ERR_ZERO);
            });

            it("revert if no tokens were sent to contract", async () => {
                await truffleAssert.reverts(prime.close(Alice), ERR_ZERO);
            });

            it("revert if not enough tokenP was sent into contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                let inTokenR = new BN(inTokenP)
                    .mul(new BN(quote))
                    .div(new BN(base));
                await redeem.transfer(prime.address, inTokenR, {
                    from: Alice,
                });
                await prime.transfer(prime.address, toWei("0.5"), {
                    from: Alice,
                });
                await truffleAssert.reverts(
                    prime.close(Alice),
                    ERR_BAL_UNDERLYING
                );
            });

            // Interesting, the two 0s at the end of this are necessary. If they are not 0s, the
            // returned value will be unequal because the accuracy of the mint is only 10^16.
            // This should be verified further.
            it("closes consecutively", async () => {
                let inTokenU = toWei("200");
                await mint(inTokenU);
                await close(toWei("0.1"));
                await close(toWei("0.34521"));
                await close("2323234235000");
            });
        });

        describe("full test", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    tokenU,
                    tokenS,
                    base,
                    quote,
                    expiry
                );

                prime = Primitive.prime;
                redeem = Primitive.redeem;
            });

            it("handles multiple transactions", async () => {
                // Start with 1000 s
                await tokenU.mint(Alice, THOUSAND_ETHER);
                let inTokenU = THOUSAND_ETHER;
                await mint(inTokenU);
                await close(ONE_ETHER);
                await exercise(toWei("200"));
                await callRedeem(toWei("0.1"));
                await close(ONE_ETHER);
                await exercise(ONE_ETHER);
                await exercise(ONE_ETHER);
                await exercise(ONE_ETHER);
                await exercise(ONE_ETHER);
                await callRedeem(toWei("0.23"));
                await callRedeem(toWei("0.1234"));
                await callRedeem(toWei("0.15"));
                await callRedeem(toWei("0.2543"));
                await close(FIVE_ETHER);
                await close(await prime.balanceOf(Alice));
                await callRedeem(await redeem.balanceOf(Alice));
            });
        });

        describe("update", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    tokenU,
                    tokenS,
                    base,
                    quote,
                    expiry
                );

                prime = Primitive.prime;
                redeem = Primitive.redeem;
            });

            it("should update the cached balances with the current balances", async () => {
                await tokenU.mint(Alice, THOUSAND_ETHER);
                let inTokenU = THOUSAND_ETHER;
                let inTokenS = new BN(inTokenU)
                    .mul(new BN(quote))
                    .div(new BN(base));
                await tokenS.deposit({ from: Alice, value: inTokenS });
                await mint(inTokenU);
                await tokenU.transfer(prime.address, inTokenU, {
                    from: Alice,
                });
                await tokenS.transfer(prime.address, inTokenS, {
                    from: Alice,
                });
                await redeem.transfer(prime.address, inTokenS, {
                    from: Alice,
                });
                let update = await prime.update();

                let cacheU = await getCache("u");
                let cacheS = await getCache("s");
                let balanceU = await getBalance(tokenU, prime.address);
                let balanceS = await getBalance(tokenS, prime.address);

                assertBNEqual(cacheU, balanceU);
                assertBNEqual(cacheS, balanceS);

                await truffleAssert.eventEmitted(update, "Fund", (ev) => {
                    return (
                        expect(ev.cacheU.toString()).to.be.eq(
                            cacheU.toString()
                        ) &&
                        expect(ev.cacheS.toString()).to.be.eq(cacheS.toString())
                    );
                });
            });
        });

        describe("take", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    tokenU,
                    tokenS,
                    base,
                    quote,
                    expiry
                );

                prime = Primitive.prime;
                redeem = Primitive.redeem;
            });

            it("should take the balances which are not in the cache", async () => {
                await tokenU.mint(Alice, THOUSAND_ETHER);
                await tokenU.mint(Alice, THOUSAND_ETHER);
                let inTokenU = THOUSAND_ETHER;
                let inTokenS = new BN(inTokenU)
                    .mul(new BN(quote))
                    .div(new BN(base));
                await tokenS.deposit({ from: Alice, value: inTokenS });
                await mint(inTokenU);
                await tokenU.transfer(prime.address, inTokenU, {
                    from: Alice,
                });
                await tokenS.transfer(prime.address, inTokenS, {
                    from: Alice,
                });
                await redeem.transfer(prime.address, inTokenS, {
                    from: Alice,
                });
                let take = await prime.take();

                let cacheU = await getCache("u");
                let cacheS = await getCache("s");
                let balanceU = await getBalance(tokenU, prime.address);
                let balanceS = await getBalance(tokenS, prime.address);

                assertBNEqual(cacheU, balanceU);
                assertBNEqual(cacheS, balanceS);
                await verifyOptionInvariants(tokenU, tokenS, prime, redeem);
            });
        });

        describe("test expired", () => {
            beforeEach(async () => {
                prime = await OptionTest.new(
                    tokenU.address,
                    tokenS.address,
                    base,
                    quote,
                    expiry
                );
                redeem = await newTestRedeem(
                    Alice,
                    prime.address,
                    tokenU.address
                );
                await prime.setTokenR(redeem.address);
                let inTokenU = THOUSAND_ETHER;
                await tokenU.mint(Alice, inTokenU);
                await tokenU.transfer(prime.address, inTokenU);
                await prime.mint(Alice);
                let expired = "1589386232";
                await prime.setExpiry(expired);
            });

            it("should be expired", async () => {
                let expired = "1589386232";
                assert.equal(await prime.expiry(), expired);
            });

            it("should close position with just redeem tokens after expiry", async () => {
                let cache0U = await getCache("u");
                let cache0S = await getCache("s");
                let balance0R = await redeem.totalSupply();
                let balance0U = await getBalance(tokenU, Alice);
                let balance0CU = await getBalance(tokenU, prime.address);
                let balance0S = await getBalance(tokenS, prime.address);

                let inTokenR = await redeem.balanceOf(Alice);
                await redeem.transfer(prime.address, inTokenR);
                await prime.close(Alice);

                let balance1R = await redeem.totalSupply();
                let balance1U = await getBalance(tokenU, Alice);
                let balance1CU = await getBalance(tokenU, prime.address);
                let balance1S = await getBalance(tokenS, prime.address);

                let deltaR = balance1R.sub(balance0R);
                let deltaU = balance1U.sub(balance0U);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaS = balance1S.sub(balance0S);

                assertBNEqual(deltaR, inTokenR.neg());
                assertBNEqual(deltaU, cache0U);
                assertBNEqual(deltaCU, cache0U.neg());
                assertBNEqual(deltaS, cache0S);
            });

            it("revert when calling mint on an expired prime", async () => {
                await truffleAssert.reverts(prime.mint(Alice), ERR_EXPIRED);
            });

            it("revert when calling swap on an expired prime", async () => {
                await truffleAssert.reverts(
                    prime.exercise(Alice, 1, []),
                    ERR_EXPIRED
                );
            });
        });

        describe("test bad ERC20", () => {
            beforeEach(async () => {
                tokenU = await newBadERC20(
                    "Bad ERC20 Doesnt Return Bools",
                    "BADU"
                );
                tokenS = await newBadERC20(
                    "Bad ERC20 Doesnt Return Bools",
                    "BADS"
                );
                prime = await OptionTest.new(
                    tokenU.address,
                    tokenS.address,
                    base,
                    quote,
                    expiry
                );
                redeem = await newTestRedeem(
                    Alice,
                    prime.address,
                    tokenU.address
                );
                await prime.setTokenR(redeem.address);
                tokenP = prime.address;
                tokenR = await prime.tokenR();
                let inTokenU = THOUSAND_ETHER;
                await tokenU.mint(Alice, inTokenU);
                await tokenS.mint(Alice, inTokenU);
                await tokenU.transfer(prime.address, inTokenU);
                await prime.mint(Alice);
            });

            it("should revert on swap because transfer does not return a boolean", async () => {
                let inTokenP = HUNDRED_ETHER;
                let inTokenS = toWei("0.5"); // 100 ether (tokenU:base) / 200 (tokenS:quote) = 0.5 tokenS
                await tokenS.transfer(prime.address, inTokenS);
                await prime.transfer(prime.address, inTokenP);
                await truffleAssert.reverts(
                    prime.exercise(Alice, inTokenP, [])
                );
            });

            it("should revert on redeem because transfer does not return a boolean", async () => {
                // no way to swap, because it reverts, so we need to send tokenS and call update()
                let inTokenS = toWei("0.5"); // 100 ether (tokenU:base) / 200 (tokenS:quote) = 0.5 tokenS
                await tokenS.transfer(prime.address, inTokenS);
                await prime.update();
                await redeem.transfer(prime.address, inTokenS);
                await truffleAssert.reverts(prime.redeem(Alice));
            });

            it("should revert on close because transfer does not return a boolean", async () => {
                // no way to swap, because it reverts, so we need to send tokenS and call update()
                let inTokenP = HUNDRED_ETHER;
                let inTokenR = toWei("0.5"); // 100 ether (tokenU:base) / 200 (tokenS:quote) = 0.5 tokenS
                await redeem.transfer(prime.address, inTokenR);
                await prime.transfer(prime.address, inTokenP);
                await truffleAssert.reverts(prime.close(Alice));
            });
        });
    });
});
