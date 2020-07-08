const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const utils = require("../lib/utils");
const setup = require("../lib/setup");
const constants = require("../lib/constants");
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

contract("Option Contract", (accounts) => {
    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let weth, dai, optionToken, redeemToken;
    let underlyingToken, strikeToken;
    let base, quote, expiry;
    let registry, factoryOption, Primitive;

    before(async () => {
        weth = await newWeth();
        dai = await newERC20("TEST DAI", "DAI", MILLION_ETHER);
        registry = await newRegistry();
        factoryOption = await newOptionFactory(registry);

        underlyingToken = dai;
        strikeToken = weth;
        base = toWei("200");
        quote = toWei("1");
        expiry = "1690868800"; // May 30, 2020, 8PM UTC

        Primitive = await newPrimitive(
            registry,
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );

        optionToken = Primitive.optionToken;
        redeemToken = Primitive.redeemToken;

        await weth.deposit({ value: FIFTY_ETHER });

        getBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        };

        getCache = async (cache) => {
            switch (cache) {
                case "u":
                    cache = new BN(await optionToken.underlyingCache());
                    break;
                case "s":
                    cache = new BN(await optionToken.strikeCache());
                    break;
            }
            return cache;
        };
    });

    describe("Registry", () => {
        it("should get the option", async () => {
            let option = await registry.getOption(
                underlyingToken.address,
                strikeToken.address,
                base,
                quote,
                expiry
            );
            assert.equal(
                option,
                optionToken.address,
                "Incorrect option address"
            );
        });

        it("reverts if one of the tokens in an option is address zero", async () => {
            await truffleAssert.reverts(
                registry.deployOption(
                    ZERO_ADDRESS,
                    strikeToken.address,
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
                (await redeemToken.factory()).toString(),
                registry.address,
                "Incorrect controller"
            );
        });
        it("should return the correct optionToken", async () => {
            assert.equal(
                (await redeemToken.optionToken()).toString(),
                optionToken.address,
                "Incorrect optionToken"
            );
        });
        it("should return the correct strikeToken", async () => {
            assert.equal(
                (await redeemToken.redeemableToken()).toString(),
                strikeToken.address,
                "Incorrect strikeToken"
            );
        });
        it("should revert on mint if msg.sender is not optionToken contract", async () => {
            await truffleAssert.reverts(
                redeemToken.mint(Alice, 10),
                ERR_NOT_VALID
            );
        });
        it("should revert on burn if msg.sender is not optionToken contract", async () => {
            await truffleAssert.reverts(
                redeemToken.burn(Alice, 10),
                ERR_NOT_VALID
            );
        });
    });
    describe(" Option", () => {
        it("should return the correct underlyingToken", async () => {
            assert.equal(
                (await optionToken.underlyingToken()).toString(),
                underlyingToken.address,
                "Incorrect underlyingToken"
            );
        });

        it("should return the correct strikeToken", async () => {
            assert.equal(
                (await optionToken.strikeToken()).toString(),
                strikeToken.address,
                "Incorrect strikeToken"
            );
        });

        it("should return the correct tokenR", async () => {
            assert.equal(
                (await optionToken.tokenR()).toString(),
                redeemToken.address,
                "Incorrect tokenR"
            );
        });

        it("should return the correct base", async () => {
            assert.equal(
                (await optionToken.base()).toString(),
                base,
                "Incorrect base"
            );
        });

        it("should return the correct quote", async () => {
            assert.equal(
                (await optionToken.quote()).toString(),
                quote,
                "Incorrect quote"
            );
        });

        it("should return the correct expiry", async () => {
            assert.equal(
                (await optionToken.expiry()).toString(),
                expiry,
                "Incorrect expiry"
            );
        });

        it("should return the correct optionToken", async () => {
            let result = await optionToken.getParameters();
            assert.equal(
                result._underlyingToken.toString(),
                underlyingToken.address,
                "Incorrect underlying"
            );
            assert.equal(
                result._strikeToken.toString(),
                strikeToken.address,
                "Incorrect strike"
            );
            assert.equal(
                result._tokenR.toString(),
                redeemToken.address,
                "Incorrect redeem"
            );
            assert.equal(result._base.toString(), base, "Incorrect base");
            assert.equal(result._quote.toString(), quote, "Incorrect quote");
            assert.equal(result._expiry.toString(), expiry, "Incorrect expiry");
        });

        it("should get the tokens", async () => {
            let result = await optionToken.tokens();
            assert.equal(
                result._underlyingToken.toString(),
                underlyingToken.address,
                "Incorrect underlyingToken"
            );
            assert.equal(
                result._strikeToken.toString(),
                strikeToken.address,
                "Incorrect strikeToken"
            );
            assert.equal(
                result._tokenR.toString(),
                redeemToken.address,
                "Incorrect tokenR"
            );
        });

        it("should get the caches", async () => {
            let result = await optionToken.caches();
            assert.equal(
                result._underlyingCache.toString(),
                "0",
                "Incorrect underlyingCache"
            );
            assert.equal(
                result._strikeCache.toString(),
                "0",
                "Incorrect strikeCache"
            );
        });

        it("should return the correct initial underlyingCache", async () => {
            assert.equal(
                (await optionToken.underlyingCache()).toString(),
                0,
                "Incorrect underlyingCache"
            );
        });

        it("should return the correct initial strikeCache", async () => {
            assert.equal(
                (await optionToken.strikeCache()).toString(),
                0,
                "Incorrect strikeCache"
            );
        });

        it("should return the correct initial factory", async () => {
            assert.equal(
                (await optionToken.factory()).toString(),
                factoryOption.address,
                "Incorrect factory"
            );
        });

        it("should return the correct optionToken for redeemToken", async () => {
            assert.equal(
                (await redeemToken.optionToken()).toString(),
                optionToken.address,
                "Incorrect optionToken"
            );
        });

        it("should return the correct strikeToken for redeemToken", async () => {
            assert.equal(
                (await redeemToken.redeemableToken()).toString(),
                strikeToken.address,
                "Incorrect strikeToken"
            );
        });

        it("should return the correct controller for redeemToken", async () => {
            assert.equal(
                (await redeemToken.factory()).toString(),
                registry.address,
                "Incorrect factory"
            );
        });

        describe("kill", () => {
            it("revert if msg.sender is not owner", async () => {
                await truffleAssert.reverts(
                    optionToken.kill({ from: Bob }),
                    ERR_NOT_OWNER
                );
            });

            it("should pause contract", async () => {
                await registry.kill(optionToken.address);
                assert.equal(await optionToken.paused(), true);
            });

            it("should revert mint function call while paused contract", async () => {
                await truffleAssert.reverts(
                    optionToken.mint(Alice),
                    ERR_PAUSED
                );
            });

            it("should revert swap function call while paused contract", async () => {
                await truffleAssert.reverts(
                    optionToken.exercise(Alice, 1, []),
                    ERR_PAUSED
                );
            });

            it("should unpause contract", async () => {
                await registry.kill(optionToken.address);
                assert.equal(await optionToken.paused(), false);
            });
        });

        describe("initTokenR", () => {
            it("revert if msg.sender is not owner", async () => {
                await truffleAssert.reverts(
                    optionToken.initTokenR(Alice, { from: Bob }),
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
                    underlyingToken,
                    strikeToken,
                    base,
                    quote,
                    expiry
                );

                optionToken = Primitive.optionToken;
                redeemToken = Primitive.redeemToken;

                mint = async (inTokenU) => {
                    inTokenU = new BN(inTokenU);
                    let outTokenR = inTokenU
                        .mul(new BN(quote))
                        .div(new BN(base));

                    let balanceU = await getBalance(underlyingToken, Alice);
                    let balanceP = await getBalance(optionToken, Alice);
                    let balanceR = await getBalance(redeemToken, Alice);

                    await underlyingToken.transfer(
                        optionToken.address,
                        inTokenU,
                        {
                            from: Alice,
                        }
                    );
                    let event = await optionToken.mint(Alice);

                    let deltaU = (await getBalance(underlyingToken, Alice)).sub(
                        balanceU
                    );
                    let deltaP = (await getBalance(optionToken, Alice)).sub(
                        balanceP
                    );
                    let deltaR = (await getBalance(redeemToken, Alice)).sub(
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

                    let underlyingCache = await getCache("u");
                    let strikeCache = await getCache("s");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.underlyingCache.toString()).to.be.eq(
                                underlyingCache.toString()
                            ) &&
                            expect(ev.strikeCache.toString()).to.be.eq(
                                strikeCache.toString()
                            )
                        );
                    });
                    await verifyOptionInvariants(
                        underlyingToken,
                        strikeToken,
                        optionToken,
                        redeemToken
                    );
                };
            });

            it("revert if no tokens were sent to contract", async () => {
                await truffleAssert.reverts(optionToken.mint(Alice), ERR_ZERO);
            });

            it("mint optionToken and tokenR to Alice", async () => {
                let inTokenU = ONE_ETHER;
                await mint(inTokenU);
            });

            it("should revert by sending 1 wei of underlyingToken to optionToken and call mint", async () => {
                let inTokenU = "1";
                await underlyingToken.transfer(optionToken.address, inTokenU, {
                    from: Alice,
                });
                await truffleAssert.reverts(optionToken.mint(Alice), ERR_ZERO);
            });
        });

        describe("exercise", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    underlyingToken,
                    strikeToken,
                    base,
                    quote,
                    expiry
                );

                optionToken = Primitive.optionToken;
                redeemToken = Primitive.redeemToken;

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

                    let balanceU = await getBalance(underlyingToken, Alice);
                    let balanceP = await getBalance(optionToken, Alice);
                    let balanceS = await getBalance(strikeToken, Alice);
                    if (underlyingToken.address == weth.address)
                        await strikeToken.deposit({ value: fee.add(inTokenS) });
                    await optionToken.transfer(optionToken.address, inTokenP, {
                        from: Alice,
                    });
                    await strikeToken.transfer(
                        optionToken.address,
                        inTokenS.add(fee),
                        {
                            from: Alice,
                        }
                    );

                    let event = await optionToken.exercise(Alice, inTokenP, []);

                    let deltaU = (await getBalance(underlyingToken, Alice)).sub(
                        balanceU
                    );
                    let deltaP = (await getBalance(optionToken, Alice)).sub(
                        balanceP
                    );
                    let deltaS = (await getBalance(strikeToken, Alice)).sub(
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

                    let underlyingCache = await getCache("u");
                    let strikeCache = await getCache("s");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.underlyingCache.toString()).to.be.eq(
                                underlyingCache.toString()
                            ) &&
                            expect(ev.strikeCache.toString()).to.be.eq(
                                strikeCache.toString()
                            )
                        );
                    });
                    await verifyOptionInvariants(
                        underlyingToken,
                        strikeToken,
                        optionToken,
                        redeemToken
                    );
                };
            });

            it("revert if 0 underlyingToken requested to be taken out", async () => {
                await truffleAssert.reverts(
                    optionToken.exercise(Alice, 0, []),
                    ERR_ZERO
                );
            });

            it("revert if not enough underlying tokens to take", async () => {
                await truffleAssert.reverts(
                    optionToken.exercise(Alice, ONE_ETHER, []),
                    ERR_BAL_UNDERLYING
                );
            });

            it("reverts if outTokenU > inTokenP, not enough optionToken was sent in", async () => {
                await mint(toWei("0.01"));
                await optionToken.transfer(optionToken.address, toWei("0.01"));
                await strikeToken.deposit({ from: Alice, value: quote });
                await strikeToken.transfer(optionToken.address, quote);
                await truffleAssert.reverts(
                    optionToken.exercise(Alice, quote, [], { from: Alice }),
                    ERR_BAL_UNDERLYING
                );
                await optionToken.take();
            });

            it("reverts if 0 strikeToken and 0 underlyingToken are sent into contract", async () => {
                await mint(FIVE_ETHER);
                await truffleAssert.reverts(
                    optionToken.exercise(Alice, ONE_ETHER, [], { from: Alice }),
                    ERR_ZERO
                );
            });

            it("should revert because no optionToken were sent to contract", async () => {
                await mint(FIVE_ETHER);
                await strikeToken.transfer(optionToken.address, quote);
                await truffleAssert.reverts(
                    optionToken.exercise(Alice, ONE_ETHER, [], { from: Alice }),
                    "ERR_BAL_INPUT"
                );
            });

            it("exercises consecutively", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                await strikeToken.deposit({ from: Alice, value: quote });
                await exercise(toWei("0.1"));
                await exercise(toWei("0.34521"));

                // Interesting, the two 0s at the end of this are necessary. If they are not 0s, the
                // returned value will be unequal because the accuracy of the mint is only 10^16.
                // This should be verified further.
                await exercise("2323234235200");
            });
        });

        describe("redeemToken", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    underlyingToken,
                    strikeToken,
                    base,
                    quote,
                    expiry
                );

                optionToken = Primitive.optionToken;
                redeemToken = Primitive.redeemToken;

                callRedeem = async (inTokenR) => {
                    inTokenR = new BN(inTokenR);
                    let outTokenS = inTokenR;

                    let balanceS = await getBalance(strikeToken, Alice);
                    let balanceR = await getBalance(redeemToken, Alice);

                    await redeemToken.transfer(optionToken.address, inTokenR, {
                        from: Alice,
                    });
                    let event = await optionToken.redeemToken(Alice);

                    let deltaS = (await getBalance(strikeToken, Alice)).sub(
                        balanceS
                    );
                    let deltaR = (await getBalance(redeemToken, Alice)).sub(
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

                    let underlyingCache = await getCache("u");
                    let strikeCache = await getCache("s");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.underlyingCache.toString()).to.be.eq(
                                underlyingCache.toString()
                            ) &&
                            expect(ev.strikeCache.toString()).to.be.eq(
                                strikeCache.toString()
                            )
                        );
                    });
                    await verifyOptionInvariants(
                        underlyingToken,
                        strikeToken,
                        optionToken,
                        redeemToken
                    );
                };
            });

            it("revert if 0 tokenR were sent to contract", async () => {
                await truffleAssert.reverts(
                    optionToken.redeemToken(Alice),
                    ERR_ZERO
                );
            });

            it("reverts if not enough strikeToken in optionToken contract", async () => {
                await mint(toWei("200"));
                await redeemToken.transfer(optionToken.address, toWei("1"));
                await truffleAssert.reverts(
                    optionToken.redeemToken(Alice, { from: Alice }),
                    ERR_BAL_STRIKE
                );
                await optionToken.take();
            });

            it("redeemTokens consecutively", async () => {
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
                    underlyingToken,
                    strikeToken,
                    base,
                    quote,
                    expiry
                );

                optionToken = Primitive.optionToken;
                redeemToken = Primitive.redeemToken;

                close = async (inTokenP) => {
                    inTokenP = new BN(inTokenP);
                    let inTokenR = inTokenP
                        .mul(new BN(quote))
                        .div(new BN(base));
                    let outTokenU = inTokenP;

                    let balanceR = await getBalance(redeemToken, Alice);
                    let balanceU = await getBalance(underlyingToken, Alice);
                    let balanceP = await getBalance(optionToken, Alice);

                    await optionToken.transfer(optionToken.address, inTokenP, {
                        from: Alice,
                    });
                    await redeemToken.transfer(optionToken.address, inTokenR, {
                        from: Alice,
                    });
                    let event = await optionToken.close(Alice);

                    let deltaU = (await getBalance(underlyingToken, Alice)).sub(
                        balanceU
                    );
                    let deltaP = (await getBalance(optionToken, Alice)).sub(
                        balanceP
                    );
                    let deltaR = (await getBalance(redeemToken, Alice)).sub(
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

                    let underlyingCache = await getCache("u");
                    let strikeCache = await getCache("s");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.underlyingCache.toString()).to.be.eq(
                                underlyingCache.toString()
                            ) &&
                            expect(ev.strikeCache.toString()).to.be.eq(
                                strikeCache.toString()
                            )
                        );
                    });
                    await verifyOptionInvariants(
                        underlyingToken,
                        strikeToken,
                        optionToken,
                        redeemToken
                    );
                };
            });

            it("revert if 0 tokenR were sent to contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                await optionToken.transfer(optionToken.address, inTokenP, {
                    from: Alice,
                });
                await truffleAssert.reverts(optionToken.close(Alice), ERR_ZERO);
            });

            it("revert if 0 optionToken were sent to contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                let inTokenR = new BN(inTokenP)
                    .mul(new BN(quote))
                    .div(new BN(base));
                await redeemToken.transfer(optionToken.address, inTokenR, {
                    from: Alice,
                });
                await truffleAssert.reverts(optionToken.close(Alice), ERR_ZERO);
            });

            it("revert if no tokens were sent to contract", async () => {
                await truffleAssert.reverts(optionToken.close(Alice), ERR_ZERO);
            });

            it("revert if not enough optionToken was sent into contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                let inTokenR = new BN(inTokenP)
                    .mul(new BN(quote))
                    .div(new BN(base));
                await redeemToken.transfer(optionToken.address, inTokenR, {
                    from: Alice,
                });
                await optionToken.transfer(optionToken.address, toWei("0.5"), {
                    from: Alice,
                });
                await truffleAssert.reverts(
                    optionToken.close(Alice),
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
                    underlyingToken,
                    strikeToken,
                    base,
                    quote,
                    expiry
                );

                optionToken = Primitive.optionToken;
                redeemToken = Primitive.redeemToken;
            });

            it("handles multiple transactions", async () => {
                // Start with 1000 s
                await underlyingToken.mint(Alice, THOUSAND_ETHER);
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
                await close(await optionToken.balanceOf(Alice));
                await callRedeem(await redeemToken.balanceOf(Alice));
            });
        });

        describe("update", () => {
            beforeEach(async () => {
                registry = await newRegistry();
                factoryOption = await newOptionFactory(registry);
                Primitive = await newPrimitive(
                    registry,
                    underlyingToken,
                    strikeToken,
                    base,
                    quote,
                    expiry
                );

                optionToken = Primitive.optionToken;
                redeemToken = Primitive.redeemToken;
            });

            it("should update the cached balances with the current balances", async () => {
                await underlyingToken.mint(Alice, THOUSAND_ETHER);
                let inTokenU = THOUSAND_ETHER;
                let inTokenS = new BN(inTokenU)
                    .mul(new BN(quote))
                    .div(new BN(base));
                await strikeToken.deposit({ from: Alice, value: inTokenS });
                await mint(inTokenU);
                await underlyingToken.transfer(optionToken.address, inTokenU, {
                    from: Alice,
                });
                await strikeToken.transfer(optionToken.address, inTokenS, {
                    from: Alice,
                });
                await redeemToken.transfer(optionToken.address, inTokenS, {
                    from: Alice,
                });
                let update = await optionToken.update();

                let underlyingCache = await getCache("u");
                let strikeCache = await getCache("s");
                let balanceU = await getBalance(
                    underlyingToken,
                    optionToken.address
                );
                let balanceS = await getBalance(
                    strikeToken,
                    optionToken.address
                );

                assertBNEqual(underlyingCache, balanceU);
                assertBNEqual(strikeCache, balanceS);

                await truffleAssert.eventEmitted(update, "Fund", (ev) => {
                    return (
                        expect(ev.underlyingCache.toString()).to.be.eq(
                            underlyingCache.toString()
                        ) &&
                        expect(ev.strikeCache.toString()).to.be.eq(
                            strikeCache.toString()
                        )
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
                    underlyingToken,
                    strikeToken,
                    base,
                    quote,
                    expiry
                );

                optionToken = Primitive.optionToken;
                redeemToken = Primitive.redeemToken;
            });

            it("should take the balances which are not in the cache", async () => {
                await underlyingToken.mint(Alice, THOUSAND_ETHER);
                await underlyingToken.mint(Alice, THOUSAND_ETHER);
                let inTokenU = THOUSAND_ETHER;
                let inTokenS = new BN(inTokenU)
                    .mul(new BN(quote))
                    .div(new BN(base));
                await strikeToken.deposit({ from: Alice, value: inTokenS });
                await mint(inTokenU);
                await underlyingToken.transfer(optionToken.address, inTokenU, {
                    from: Alice,
                });
                await strikeToken.transfer(optionToken.address, inTokenS, {
                    from: Alice,
                });
                await redeemToken.transfer(optionToken.address, inTokenS, {
                    from: Alice,
                });
                let take = await optionToken.take();

                let underlyingCache = await getCache("u");
                let strikeCache = await getCache("s");
                let balanceU = await getBalance(
                    underlyingToken,
                    optionToken.address
                );
                let balanceS = await getBalance(
                    strikeToken,
                    optionToken.address
                );

                assertBNEqual(underlyingCache, balanceU);
                assertBNEqual(strikeCache, balanceS);
                await verifyOptionInvariants(
                    underlyingToken,
                    strikeToken,
                    optionToken,
                    redeemToken
                );
            });
        });

        describe("test expired", () => {
            beforeEach(async () => {
                optionToken = await newTestOption(
                    underlyingToken.address,
                    strikeToken.address,
                    base,
                    quote,
                    expiry
                );
                redeemToken = await newTestRedeem(
                    Alice,
                    optionToken.address,
                    underlyingToken.address
                );
                await optionToken.setTokenR(redeemToken.address);
                let inTokenU = THOUSAND_ETHER;
                await underlyingToken.mint(Alice, inTokenU);
                await underlyingToken.transfer(optionToken.address, inTokenU);
                await optionToken.mint(Alice);
                let expired = "1589386232";
                await optionToken.setExpiry(expired);
            });

            it("should be expired", async () => {
                let expired = "1589386232";
                assert.equal(await optionToken.expiry(), expired);
            });

            it("should close position with just redeemToken tokens after expiry", async () => {
                let cache0U = await getCache("u");
                let cache0S = await getCache("s");
                let balance0R = await redeemToken.totalSupply();
                let balance0U = await getBalance(underlyingToken, Alice);
                let balance0CU = await getBalance(
                    underlyingToken,
                    optionToken.address
                );
                let balance0S = await getBalance(
                    strikeToken,
                    optionToken.address
                );

                let inTokenR = await redeemToken.balanceOf(Alice);
                await redeemToken.transfer(optionToken.address, inTokenR);
                await optionToken.close(Alice);

                let balance1R = await redeemToken.totalSupply();
                let balance1U = await getBalance(underlyingToken, Alice);
                let balance1CU = await getBalance(
                    underlyingToken,
                    optionToken.address
                );
                let balance1S = await getBalance(
                    strikeToken,
                    optionToken.address
                );

                let deltaR = balance1R.sub(balance0R);
                let deltaU = balance1U.sub(balance0U);
                let deltaCU = balance1CU.sub(balance0CU);
                let deltaS = balance1S.sub(balance0S);

                assertBNEqual(deltaR, inTokenR.neg());
                assertBNEqual(deltaU, cache0U);
                assertBNEqual(deltaCU, cache0U.neg());
                assertBNEqual(deltaS, cache0S);
            });

            it("revert when calling mint on an expired optionToken", async () => {
                await truffleAssert.reverts(
                    optionToken.mint(Alice),
                    ERR_EXPIRED
                );
            });

            it("revert when calling swap on an expired optionToken", async () => {
                await truffleAssert.reverts(
                    optionToken.exercise(Alice, 1, []),
                    ERR_EXPIRED
                );
            });
        });

        describe("test bad ERC20", () => {
            beforeEach(async () => {
                underlyingToken = await newBadERC20(
                    "Bad ERC20 Doesnt Return Bools",
                    "BADU"
                );
                strikeToken = await newBadERC20(
                    "Bad ERC20 Doesnt Return Bools",
                    "BADS"
                );
                optionToken = await newTestOption(
                    underlyingToken.address,
                    strikeToken.address,
                    base,
                    quote,
                    expiry
                );
                redeemToken = await newTestRedeem(
                    Alice,
                    optionToken.address,
                    underlyingToken.address
                );
                await optionToken.setTokenR(redeemToken.address);
                optionToken = optionToken.address;
                tokenR = await optionToken.tokenR();
                let inTokenU = THOUSAND_ETHER;
                await underlyingToken.mint(Alice, inTokenU);
                await strikeToken.mint(Alice, inTokenU);
                await underlyingToken.transfer(optionToken.address, inTokenU);
                await optionToken.mint(Alice);
            });

            it("should revert on swap because transfer does not return a boolean", async () => {
                let inTokenP = HUNDRED_ETHER;
                let inTokenS = toWei("0.5"); // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
                await strikeToken.transfer(optionToken.address, inTokenS);
                await optionToken.transfer(optionToken.address, inTokenP);
                await truffleAssert.reverts(
                    optionToken.exercise(Alice, inTokenP, [])
                );
            });

            it("should revert on redeemToken because transfer does not return a boolean", async () => {
                // no way to swap, because it reverts, so we need to send strikeToken and call update()
                let inTokenS = toWei("0.5"); // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
                await strikeToken.transfer(optionToken.address, inTokenS);
                await optionToken.update();
                await redeemToken.transfer(optionToken.address, inTokenS);
                await truffleAssert.reverts(optionToken.redeemToken(Alice));
            });

            it("should revert on close because transfer does not return a boolean", async () => {
                // no way to swap, because it reverts, so we need to send strikeToken and call update()
                let inTokenP = HUNDRED_ETHER;
                let inTokenR = toWei("0.5"); // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
                await redeemToken.transfer(optionToken.address, inTokenR);
                await optionToken.transfer(optionToken.address, inTokenP);
                await truffleAssert.reverts(optionToken.close(Alice));
            });
        });
    });
});
