const { assert, expect } = require("chai");
const utils = require("../lib/utils");
const setup = require("../lib/setup");
const constants = require("../lib/constants");
const { parseEther, parseUnits } = require("ethers/lib/utils");
const { assertBNEqual, verifyOptionInvariants, getTokenBalances } = utils;
const {
    newWallets,
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

describe("Option Contract", () => {
    // ACCOUNTS
    const wallets = newWallets();
    const Admin = wallets[0];
    const User = wallets[1];
    const Alice = Admin.address;
    const Bob = User.address;

    let weth, dai, optionToken, redeemToken;
    let underlyingToken, strikeToken;
    let base, quote, expiry;
    let registry, factoryOption, Primitive;

    before(async () => {
        weth = await newWeth(Admin);
        dai = await newERC20(Admin, "TEST DAI", "DAI", MILLION_ETHER);
        registry = await newRegistry(Admin);
        factoryOption = await newOptionFactory(Admin, registry);

        underlyingToken = dai;
        strikeToken = weth;
        base = parseEther("200").toString();
        quote = parseEther("1").toString();
        expiry = "1690868800"; // May 30, 2020, 8PM UTC

        Primitive = await newPrimitive(
            Admin,
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
            let bal = await token.balanceOf(address);
            return bal;
        };

        getCache = async (cache) => {
            switch (cache) {
                case "u":
                    cache = await optionToken.underlyingCache();
                    break;
                case "s":
                    cache = await optionToken.strikeCache();
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
            expect(option).to.be.eq(optionToken.address);
        });

        it("reverts if one of the tokens in an option is address zero", async () => {
            await expect(
                registry.deployOption(
                    ZERO_ADDRESS,
                    strikeToken.address,
                    base,
                    quote,
                    expiry
                )
            ).to.be.revertedWith("ERR_ADDRESS");
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
            await expect(redeemToken.mint(Alice, 10)).to.be.revertedWith(
                ERR_NOT_VALID
            );
        });
        it("should revert on burn if msg.sender is not optionToken contract", async () => {
            await expect(redeemToken.burn(Alice, 10)).to.be.revertedWith(
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

        it("should return the correct redeemToken", async () => {
            assert.equal(
                (await optionToken.redeemToken()).toString(),
                redeemToken.address,
                "Incorrect redeemToken"
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
                result._redeemToken.toString(),
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
                result._redeemToken.toString(),
                redeemToken.address,
                "Incorrect redeemToken"
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
                await expect(
                    optionToken.connect(Bob).kill()
                ).to.be.revertedWith(ERR_NOT_OWNER);
            });

            it("should pause contract", async () => {
                await registry.kill(optionToken.address);
                assert.equal(await optionToken.paused(), true);
            });

            it("should revert mint function call while paused contract", async () => {
                await expect(optionToken.mint(Alice)).to.be.revertedWith(
                    ERR_PAUSED
                );
            });

            it("should revert swap function call while paused contract", async () => {
                await expect(
                    optionToken.exercise(Alice, 1, [])
                ).to.be.revertedWith(ERR_PAUSED);
            });

            it("should unpause contract", async () => {
                await registry.kill(optionToken.address);
                assert.equal(await optionToken.paused(), false);
            });
        });

        describe("initRedeemToken", () => {
            it("revert if msg.sender is not owner", async () => {
                await expect(
                    optionToken.connect(Bob).initRedeemToken(Alice)
                ).to.be.revertedWith(ERR_NOT_OWNER);
            });
        });

        describe("mint", () => {
            beforeEach(async () => {
                registry = await newRegistry(Admin);
                factoryOption = await newOptionFactory(Admin, registry);
                Primitive = await newPrimitive(
                    Admin,
                    registry,
                    underlyingToken,
                    strikeToken,
                    base,
                    quote,
                    expiry
                );

                optionToken = Primitive.optionToken;
                redeemToken = Primitive.redeemToken;

                mint = async (inUnderlyings) => {
                    let outTokenR = inUnderlyings.mul(quote).div(base);

                    const {
                        underlyingBalance,
                        strikeBalance,
                        optionBalance,
                        redeemBalance,
                    } = await getTokenBalances(Primitive, Alice);

                    await underlyingToken.transfer(
                        optionToken.address,
                        inUnderlyings
                    );

                    await expect(optionToken.mint(Alice))
                        .to.emit(optionToken, "Mint")
                        .withArgs(
                            Alice,
                            inUnderlyings.toString(),
                            outTokenR.toString()
                        )
                        .to.emit(optionToken, "Fund");

                    let deltaU = (await getBalance(underlyingToken, Alice)).sub(
                        underlyingBalance
                    );
                    let deltaP = (await getBalance(optionToken, Alice)).sub(
                        optionBalance
                    );
                    let deltaR = (await getBalance(redeemToken, Alice)).sub(
                        redeemBalance
                    );

                    assertBNEqual(deltaU, inUnderlyings.mul(-1));
                    assertBNEqual(deltaP, inUnderlyings);
                    assertBNEqual(deltaR, outTokenR);

                    await verifyOptionInvariants(
                        underlyingToken,
                        strikeToken,
                        optionToken,
                        redeemToken
                    );
                };
            });

            it("revert if no tokens were sent to contract", async () => {
                await expect(optionToken.mint(Alice)).to.be.revertedWith(
                    ERR_ZERO
                );
            });

            it("mint optionToken and redeemToken to Alice", async () => {
                let inUnderlyings = ONE_ETHER;
                await mint(inUnderlyings);
            });

            it("should revert by sending 1 wei of underlyingToken to optionToken and call mint", async () => {
                let inUnderlyings = "1";
                await underlyingToken.transfer(
                    optionToken.address,
                    inUnderlyings
                );
                await expect(optionToken.mint(Alice)).to.be.revertedWith(
                    ERR_ZERO
                );
            });
        });

        describe("exercise", () => {
            beforeEach(async () => {
                registry = await newRegistry(Admin);
                factoryOption = await newOptionFactory(Admin, registry);
                Primitive = await newPrimitive(
                    Admin,
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
                    let inTokenS = inTokenP.mul(quote).div(base);
                    let fee = inTokenP.div(1000).mul(quote).div(base);
                    let outTokenU = inTokenP;

                    const {
                        underlyingBalance,
                        strikeBalance,
                        optionBalance,
                        redeemBalance,
                    } = await getTokenBalances(Primitive, Alice);

                    if (underlyingToken.address == weth.address)
                        await strikeToken.deposit({ value: fee.add(inTokenS) });

                    await optionToken.transfer(optionToken.address, inTokenP);

                    await strikeToken.transfer(
                        optionToken.address,
                        inTokenS.add(fee)
                    );

                    await expect(optionToken.exercise(Alice, inTokenP, []))
                        .to.emit(optionToken, "Exercise")
                        .withArgs(Alice, outTokenU, inTokenS.add(fee))
                        .and.to.emit(optionToken, "Fund");

                    let deltaU = (await getBalance(underlyingToken, Alice)).sub(
                        underlyingBalance
                    );
                    let deltaP = (await getBalance(optionToken, Alice)).sub(
                        optionBalance
                    );
                    let deltaS = (await getBalance(strikeToken, Alice)).sub(
                        strikeBalance
                    );

                    // 1000 = fee
                    assertBNEqual(deltaU, outTokenU);
                    assertBNEqual(deltaP, inTokenP.mul(-1));
                    assertBNEqual(deltaS, inTokenS.add(fee).mul(-1));

                    await verifyOptionInvariants(
                        underlyingToken,
                        strikeToken,
                        optionToken,
                        redeemToken
                    );
                };
            });

            it("revert if 0 underlyingToken requested to be taken out", async () => {
                await expect(
                    optionToken.exercise(Alice, 0, [])
                ).to.be.revertedWith(ERR_ZERO);
            });

            it("revert if not enough underlying tokens to take", async () => {
                await expect(
                    optionToken.exercise(Alice, ONE_ETHER, [])
                ).to.be.revertedWith(ERR_BAL_UNDERLYING);
            });

            it("reverts if outTokenU > inTokenP, not enough optionToken was sent in", async () => {
                await mint(parseEther("0.01"));
                await optionToken.transfer(
                    optionToken.address,
                    parseEther("0.01")
                );
                await strikeToken.deposit({ value: quote });
                await strikeToken.transfer(optionToken.address, quote);
                await expect(
                    optionToken.exercise(Alice, quote, [])
                ).to.be.revertedWith(ERR_BAL_UNDERLYING);
                await optionToken.take();
            });

            it("reverts if 0 strikeToken and 0 underlyingToken are sent into contract", async () => {
                await mint(FIVE_ETHER);
                await expect(
                    optionToken.exercise(Alice, ONE_ETHER, [])
                ).to.be.revertedWith(ERR_ZERO);
            });

            it("should revert because no optionToken were sent to contract", async () => {
                await mint(FIVE_ETHER);
                await strikeToken.transfer(optionToken.address, quote);
                await expect(
                    optionToken.exercise(Alice, ONE_ETHER, [])
                ).to.be.revertedWith("ERR_BAL_INPUT");
            });

            it("exercises consecutively", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                await strikeToken.deposit({ value: quote });
                await exercise(parseEther("0.1"));
                await exercise(parseEther("0.34521"));

                // Interesting, the two 0s at the end of this are necessary. If they are not 0s, the
                // returned value will be unequal because the accuracy of the mint is only 10^16.
                // This should be verified further.
                await exercise(parseUnits("2323234235200", "wei"));
            });
        });

        describe("redeemToken", () => {
            beforeEach(async () => {
                registry = await newRegistry(Admin);
                factoryOption = await newOptionFactory(Admin, registry);
                Primitive = await newPrimitive(
                    Admin,
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
                    inTokenR = inTokenR;
                    let outTokenS = inTokenR;

                    const {
                        underlyingBalance,
                        strikeBalance,
                        optionBalance,
                        redeemBalance,
                    } = await getTokenBalances(Primitive, Alice);

                    await redeemToken.transfer(optionToken.address, inTokenR);
                    await expect(optionToken.redeem(Alice))
                        .to.emit(optionToken, "Redeem")
                        .withArgs(Alice, inTokenR.toString())
                        .and.to.emit(optionToken, "Fund");

                    let deltaS = (await getBalance(strikeToken, Alice)).sub(
                        strikeBalance
                    );
                    let deltaR = (await getBalance(redeemToken, Alice)).sub(
                        redeemBalance
                    );

                    assertBNEqual(deltaS, outTokenS);
                    assertBNEqual(deltaR, inTokenR.mul(-1));

                    await verifyOptionInvariants(
                        underlyingToken,
                        strikeToken,
                        optionToken,
                        redeemToken
                    );
                };
            });

            it("revert if 0 redeemToken were sent to contract", async () => {
                await expect(optionToken.redeem(Alice)).to.be.revertedWith(
                    ERR_ZERO
                );
            });

            it("reverts if not enough strikeToken in optionToken contract", async () => {
                await mint(parseEther("200"));
                await redeemToken.transfer(
                    optionToken.address,
                    parseEther("1")
                );
                await expect(optionToken.redeem(Alice)).to.be.revertedWith(
                    ERR_BAL_STRIKE
                );
                await optionToken.take();
            });

            it("redeemTokens consecutively", async () => {
                let inTokenR = ONE_ETHER;
                let inUnderlyings = inTokenR.mul(base).div(quote);
                await mint(inUnderlyings);
                await exercise(inUnderlyings);
                await callRedeem(parseEther("0.1"));
                await callRedeem(parseEther("0.34521"));
                await callRedeem(parseUnits("23232342352345", "wei"));
            });
        });

        describe("close", () => {
            beforeEach(async () => {
                registry = await newRegistry(Admin);
                console.log("hoooook");
                factoryOption = await newOptionFactory(Admin, registry);
                Primitive = await newPrimitive(
                    Admin,
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
                    let inTokenR = inTokenP.mul(quote).div(base);
                    let outTokenU = inTokenP;

                    const {
                        underlyingBalance,
                        strikeBalance,
                        optionBalance,
                        redeemBalance,
                    } = await getTokenBalances(Primitive, Alice);

                    await optionToken.transfer(optionToken.address, inTokenP);
                    await redeemToken.transfer(optionToken.address, inTokenR);

                    await expect(optionToken.close(Alice))
                        .to.emit(optionToken, "Close")
                        .withArgs(Alice, outTokenU.toString())
                        .and.to.emit(optionToken, "Fund");

                    let deltaU = (await getBalance(underlyingToken, Alice)).sub(
                        underlyingBalance
                    );
                    let deltaP = (await getBalance(optionToken, Alice)).sub(
                        optionBalance
                    );
                    let deltaR = (await getBalance(redeemToken, Alice)).sub(
                        redeemBalance
                    );

                    assertBNEqual(deltaU, outTokenU);
                    assertBNEqual(deltaP, inTokenP.mul(-1));
                    assertBNEqual(deltaR, inTokenR.mul(-1));

                    await verifyOptionInvariants(
                        underlyingToken,
                        strikeToken,
                        optionToken,
                        redeemToken
                    );
                };
            });

            it("revert if 0 redeemToken were sent to contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                await optionToken.transfer(optionToken.address, inTokenP);
                await expect(optionToken.close(Alice)).to.be.revertedWith(
                    ERR_ZERO
                );
            });

            it("revert if 0 optionToken were sent to contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                let inTokenR = inTokenP.mul(quote).div(base);
                await redeemToken.transfer(optionToken.address, inTokenR);
                await expect(optionToken.close(Alice)).to.be.revertedWith(
                    ERR_ZERO
                );
            });

            it("revert if no tokens were sent to contract", async () => {
                await expect(optionToken.close(Alice)).to.be.revertedWith(
                    ERR_ZERO
                );
            });

            it("revert if not enough optionToken was sent into contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                let inTokenR = inTokenP.mul(quote).div(base);
                await redeemToken.transfer(optionToken.address, inTokenR);
                await optionToken.transfer(
                    optionToken.address,
                    parseEther("0.5")
                );
                await expect(optionToken.close(Alice)).to.be.revertedWith(
                    ERR_BAL_UNDERLYING
                );
            });

            // Interesting, the two 0s at the end of this are necessary. If they are not 0s, the
            // returned value will be unequal because the accuracy of the mint is only 10^16.
            // This should be verified further.
            it("closes consecutively", async () => {
                let inUnderlyings = parseEther("200");
                console.log(
                    "Underlying balance",
                    (await underlyingToken.balanceOf(Alice)).toString()
                );
                await mint(inUnderlyings);

                await close(parseEther("0.1"));
                await close(parseEther("0.34521"));
                console.log("right before weird number");
                await close(parseUnits("234235000", "wei"));
            });
        });

        describe("full test", () => {
            beforeEach(async () => {
                registry = await newRegistry(Admin);
                factoryOption = await newOptionFactory(Admin, registry);
                Primitive = await newPrimitive(
                    Admin,
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
                let inUnderlyings = THOUSAND_ETHER;
                await mint(inUnderlyings);
                await close(ONE_ETHER);
                await exercise(parseEther("200"));
                await callRedeem(parseEther("0.1"));
                await close(ONE_ETHER);
                await exercise(ONE_ETHER);
                await exercise(ONE_ETHER);
                await exercise(ONE_ETHER);
                await exercise(ONE_ETHER);
                await callRedeem(parseEther("0.23"));
                await callRedeem(parseEther("0.1234"));
                await callRedeem(parseEther("0.15"));
                await callRedeem(parseEther("0.2543"));
                await close(FIVE_ETHER);
                await close(await optionToken.balanceOf(Alice));
                await callRedeem(await redeemToken.balanceOf(Alice));
            });
        });

        describe("update", () => {
            beforeEach(async () => {
                registry = await newRegistry(Admin);
                factoryOption = await newOptionFactory(Admin, registry);
                Primitive = await newPrimitive(
                    Admin,
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
                let inUnderlyings = THOUSAND_ETHER;
                let inTokenS = inUnderlyings.mul(quote).div(base);
                await strikeToken.deposit({ value: inTokenS });
                await mint(inUnderlyings);
                await underlyingToken.transfer(
                    optionToken.address,
                    inUnderlyings
                );
                await strikeToken.transfer(optionToken.address, inTokenS);
                await redeemToken.transfer(optionToken.address, inTokenS);
                await expect(optionToken.update()).to.emit(optionToken, "Fund");

                let underlyingCache = await getCache("u");
                let strikeCache = await getCache("s");
                let underlyingBalance = await getBalance(
                    underlyingToken,
                    optionToken.address
                );
                let strikeBalance = await getBalance(
                    strikeToken,
                    optionToken.address
                );

                assertBNEqual(underlyingCache, underlyingBalance);
                assertBNEqual(strikeCache, strikeBalance);
            });
        });

        describe("take", () => {
            beforeEach(async () => {
                registry = await newRegistry(Admin);
                factoryOption = await newOptionFactory(Admin, registry);
                Primitive = await newPrimitive(
                    Admin,
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
                let inUnderlyings = THOUSAND_ETHER;
                let inTokenS = inUnderlyings.mul(quote).div(base);
                await strikeToken.deposit({ value: inTokenS });
                await mint(inUnderlyings);
                await underlyingToken.transfer(
                    optionToken.address,
                    inUnderlyings
                );
                await strikeToken.transfer(optionToken.address, inTokenS);
                await redeemToken.transfer(optionToken.address, inTokenS);
                let take = await optionToken.take();

                let underlyingCache = await getCache("u");
                let strikeCache = await getCache("s");
                let underlyingBalance = await getBalance(
                    underlyingToken,
                    optionToken.address
                );
                let strikeBalance = await getBalance(
                    strikeToken,
                    optionToken.address
                );

                assertBNEqual(underlyingCache, underlyingBalance);
                assertBNEqual(strikeCache, strikeBalance);
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
                    Admin,
                    underlyingToken.address,
                    strikeToken.address,
                    base,
                    quote,
                    expiry
                );
                redeemToken = await newTestRedeem(
                    Admin,
                    Alice,
                    optionToken.address,
                    underlyingToken.address
                );
                await optionToken.setRedeemToken(redeemToken.address);
                let inUnderlyings = THOUSAND_ETHER;
                await underlyingToken.mint(Alice, inUnderlyings);
                await underlyingToken.transfer(
                    optionToken.address,
                    inUnderlyings
                );
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

                assertBNEqual(deltaR, inTokenR.mul(-1));
                assertBNEqual(deltaU, cache0U);
                assertBNEqual(deltaCU, cache0U.mul(-1));
                assertBNEqual(deltaS, cache0S);
            });

            it("revert when calling mint on an expired optionToken", async () => {
                await expect(optionToken.mint(Alice)).to.be.revertedWith(
                    ERR_EXPIRED
                );
            });

            it("revert when calling swap on an expired optionToken", async () => {
                await expect(
                    optionToken.exercise(Alice, 1, [])
                ).to.be.revertedWith(ERR_EXPIRED);
            });
        });

        describe("test bad ERC20", () => {
            beforeEach(async () => {
                underlyingToken = await newBadERC20(
                    Admin,
                    "Bad ERC20 Doesnt Return Bools",
                    "BADU"
                );
                strikeToken = await newBadERC20(
                    Admin,
                    "Bad ERC20 Doesnt Return Bools",
                    "BADS"
                );
                optionToken = await newTestOption(
                    Admin,
                    underlyingToken.address,
                    strikeToken.address,
                    base,
                    quote,
                    expiry
                );
                redeemToken = await newTestRedeem(
                    Admin,
                    Alice,
                    optionToken.address,
                    underlyingToken.address
                );
                await optionToken.setRedeemToken(redeemToken.address);
                let inUnderlyings = THOUSAND_ETHER;
                await underlyingToken.mint(Alice, inUnderlyings);
                await strikeToken.mint(Alice, inUnderlyings);
                await underlyingToken.transfer(
                    optionToken.address,
                    inUnderlyings
                );
                await optionToken.mint(Alice);
            });

            it("should revert on swap because option contract can handle bad erc20s", async () => {
                let inTokenP = HUNDRED_ETHER;
                let inTokenS = parseEther("0.515"); // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
                await strikeToken.transfer(optionToken.address, inTokenS);
                await optionToken.transfer(optionToken.address, inTokenP);
                await optionToken.exercise(Alice, inTokenP, []);
            });

            it("should not revert on redeemToken because option contract can handle bad erc20s", async () => {
                // no way to swap, because it reverts, so we need to send strikeToken and call update()
                let inTokenS = parseEther("0.5"); // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
                await strikeToken.transfer(optionToken.address, inTokenS);
                await optionToken.update();
                await redeemToken.transfer(optionToken.address, inTokenS);
                await optionToken.redeem(Alice);
            });

            it("should not revert on close because option contract can handle bad erc20s", async () => {
                // no way to swap, because it reverts, so we need to send strikeToken and call update()
                let inTokenP = HUNDRED_ETHER;
                let inTokenR = parseEther("0.5"); // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
                await redeemToken.transfer(optionToken.address, inTokenR);
                await optionToken.transfer(optionToken.address, inTokenP);
                await optionToken.close(Alice);
            });
        });
    });
});
