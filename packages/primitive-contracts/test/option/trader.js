const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const Trader = require("@primitivefi/contracts/artifacts/Trader");
const utils = require("../lib/utils");
const setup = require("../lib/setup");
const constants = require("../lib/constants");
const { toWei, assertBNEqual, verifyOptionInvariants } = utils;
const {
    newWallets,
    newERC20,
    newWeth,
    newRegistry,
    newBadERC20,
    newTestRedeem,
    newTestOption,
    newOptionFactory,
    newPrimitive,
} = setup;
const {
    ONE_ETHER,
    FIVE_ETHER,
    TEN_ETHER,
    HUNDRED_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
} = constants.VALUES;

const {
    ERR_BAL_UNDERLYING,
    ERR_ZERO,
    ERR_BAL_STRIKE,
    ERR_BAL_PRIME,
    ERR_BAL_REDEEM,
    ERR_NOT_EXPIRED,
} = constants.ERR_CODES;

describe("Trader", () => {
    // ACCOUNTS
    const wallets = newWallets();
    const Admin = wallets[0];
    const User = wallets[1];
    const Alice = Admin.address;
    const Bob = User.address;

    let trader, weth, dai, optionToken, redeemToken;
    let underlyingToken, strikeToken;
    let base, quote, expiry;
    let factory, Primitive, registry;

    before(async () => {
        weth = await newWeth();
        dai = await newERC20("TEST DAI", "DAI", THOUSAND_ETHER);
        factory = await newRegistry();
        factoryOption = await newOptionFactory(factory);

        underlyingToken = dai;
        strikeToken = weth;
        base = toWei("200");
        quote = toWei("1");
        expiry = "1690868800"; // May 30, 2020, 8PM UTC

        Primitive = await newPrimitive(
            factory,
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );

        optionToken = Primitive.optionToken;
        redeemToken = Primitive.redeemToken;
        trader = await Trader.new(weth.address);

        underlyingToken = dai;
        strikeToken = weth;

        getBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        };
    });

    describe("Constructor", () => {
        it("should return the correct weth address", async () => {
            expect(await trader.weth()).to.be.equal(weth.address);
        });
    });

    describe("safeMint", () => {
        beforeEach(async () => {
            trader = await Trader.new(weth.address);
            await underlyingToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await strikeToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });

            safeMint = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let outTokenR = inTokenU.mul(new BN(quote)).div(new BN(base));

                let balanceU = await getBalance(underlyingToken, Alice);
                let balanceP = await getBalance(optionToken, Alice);
                let balanceR = await getBalance(redeemToken, Alice);

                let mint = await trader.safeMint(
                    optionToken.address,
                    inTokenU,
                    Alice
                );

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

                await truffleAssert.eventEmitted(mint, "TraderMint", (ev) => {
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
            };
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeMint(optionToken.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if optionToken.address is not a ", async () => {
            await truffleAssert.reverts(trader.safeMint(Alice, 10, Alice));
        });

        it("should revert if msg.sender does not have enough underlyingToken for tx", async () => {
            await truffleAssert.reverts(
                trader.safeMint(optionToken.address, MILLION_ETHER, Alice),
                ERR_BAL_UNDERLYING
            );
        });

        it("should emit the mint event", async () => {
            let inTokenU = new BN(ONE_ETHER);
            let outTokenR = inTokenU.mul(new BN(quote)).div(new BN(base));
            let mint = await trader.safeMint(
                optionToken.address,
                inTokenU,
                Alice
            );
            await truffleAssert.eventEmitted(mint, "TraderMint", (ev) => {
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
        });

        it("should mint optionTokens and redeemTokens in correct amounts", async () => {
            await safeMint(ONE_ETHER);
        });

        it("should successfully call safe mint a few times in a row", async () => {
            await safeMint(ONE_ETHER);
            await safeMint(TEN_ETHER);
            await safeMint(FIVE_ETHER);
            await safeMint(toWei("0.5123542351"));
            await safeMint(toWei("1.23526231124324"));
            await safeMint(toWei("2.234345"));
        });
    });

    describe("safeExercise", () => {
        beforeEach(async () => {
            trader = await Trader.new(weth.address);
            await underlyingToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await strikeToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await optionToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await safeMint(TEN_ETHER);

            safeExercise = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let inTokenP = inTokenU;
                let inTokenS = inTokenU.mul(new BN(quote)).div(new BN(base));

                let balanceU = await getBalance(underlyingToken, Alice);
                let balanceP = await getBalance(optionToken, Alice);
                let balanceS = await getBalance(strikeToken, Alice);

                let exercise = await trader.safeExercise(
                    optionToken.address,
                    inTokenU,
                    Alice
                );

                let deltaU = (await getBalance(underlyingToken, Alice)).sub(
                    balanceU
                );
                let deltaP = (await getBalance(optionToken, Alice)).sub(
                    balanceP
                );
                let deltaS = (await getBalance(strikeToken, Alice)).sub(
                    balanceS
                );

                assertBNEqual(deltaU, inTokenU);
                assertBNEqual(deltaP, inTokenP.neg());
                assertBNEqual(
                    deltaS,
                    inTokenS.add(inTokenS.div(new BN(1000))).neg()
                );

                await truffleAssert.eventEmitted(
                    exercise,
                    "TraderExercise",
                    (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.outTokenU.toString()).to.be.eq(
                                inTokenU.toString()
                            ) &&
                            expect(ev.inTokenS.toString()).to.be.eq(
                                inTokenS
                                    .add(inTokenS.div(new BN(1000)))
                                    .toString()
                            )
                        );
                    }
                );
                await verifyOptionInvariants(
                    underlyingToken,
                    strikeToken,
                    optionToken,
                    redeemToken
                );
            };
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeExercise(optionToken.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough optionToken tokens", async () => {
            await truffleAssert.reverts(
                trader.safeExercise(optionToken.address, MILLION_ETHER, Alice)
            );
        });

        it("should revert if user does not have enough strike tokens", async () => {
            await trader.safeMint(optionToken.address, ONE_ETHER, Bob);
            await strikeToken.transfer(
                Alice,
                await strikeToken.balanceOf(Bob),
                {
                    from: Bob,
                }
            );
            await truffleAssert.reverts(
                trader.safeExercise(optionToken.address, ONE_ETHER, Bob, {
                    from: Bob,
                }),
                ERR_BAL_STRIKE
            );
        });

        it("should exercise consecutively", async () => {
            await strikeToken.deposit({
                from: Alice,
                value: TEN_ETHER,
            });
            await safeExercise(toWei("0.1"));
            await safeExercise(toWei("0.32525"));
            await safeExercise(ONE_ETHER);
        });
    });

    describe("safeRedeem", () => {
        beforeEach(async () => {
            trader = await Trader.new(weth.address);
            await underlyingToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await strikeToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await optionToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await redeemToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await safeMint(toWei("200"));

            safeRedeem = async (inTokenR) => {
                inTokenR = new BN(inTokenR);
                let outTokenS = inTokenR;

                let balanceR = await getBalance(redeemToken, Alice);
                let balanceS = await getBalance(strikeToken, Alice);

                let event = await trader.safeRedeem(
                    optionToken.address,
                    inTokenR,
                    Alice
                );

                let deltaR = (await getBalance(redeemToken, Alice)).sub(
                    balanceR
                );
                let deltaS = (await getBalance(strikeToken, Alice)).sub(
                    balanceS
                );

                assertBNEqual(deltaR, inTokenR.neg());
                assertBNEqual(deltaS, outTokenS);

                await truffleAssert.eventEmitted(
                    event,
                    "TraderRedeem",
                    (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.inTokenR.toString()).to.be.eq(
                                inTokenR.toString()
                            ) &&
                            expect(ev.inTokenR.toString()).to.be.eq(
                                outTokenS.toString()
                            )
                        );
                    }
                );
                await verifyOptionInvariants(
                    underlyingToken,
                    strikeToken,
                    optionToken,
                    redeemToken
                );
            };
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeRedeem(optionToken.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough redeemToken tokens", async () => {
            await truffleAssert.reverts(
                trader.safeRedeem(optionToken.address, MILLION_ETHER, Alice),
                ERR_BAL_REDEEM
            );
        });

        it("should revert if  contract does not have enough strike tokens", async () => {
            await truffleAssert.reverts(
                trader.safeRedeem(optionToken.address, ONE_ETHER, Alice),
                ERR_BAL_STRIKE
            );
        });

        it("should redeemToken consecutively", async () => {
            await safeExercise(toWei("200"));
            await safeRedeem(toWei("0.1"));
            await safeRedeem(toWei("0.32525"));
            await safeRedeem(toWei("0.5"));
        });
    });

    describe("safeClose", () => {
        beforeEach(async () => {
            trader = await Trader.new(weth.address);
            await underlyingToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await strikeToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await optionToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await redeemToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await safeMint(toWei("1"));

            safeClose = async (inTokenP) => {
                inTokenP = new BN(inTokenP);
                let inTokenR = inTokenP.mul(new BN(quote)).div(new BN(base));
                let outTokenU = inTokenP;

                let balanceU = await getBalance(underlyingToken, Alice);
                let balanceP = await getBalance(optionToken, Alice);
                let balanceR = await getBalance(redeemToken, Alice);

                let event = await trader.safeClose(
                    optionToken.address,
                    inTokenP,
                    Alice
                );

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

                await truffleAssert.eventEmitted(event, "TraderClose", (ev) => {
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
                await verifyOptionInvariants(
                    underlyingToken,
                    strikeToken,
                    optionToken,
                    redeemToken
                );
            };
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeClose(optionToken.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough redeemToken tokens", async () => {
            await trader.safeMint(optionToken.address, ONE_ETHER, Bob);
            await redeemToken.transfer(
                Alice,
                await redeemToken.balanceOf(Bob),
                {
                    from: Bob,
                }
            );
            await truffleAssert.reverts(
                trader.safeClose(optionToken.address, ONE_ETHER, Bob, {
                    from: Bob,
                }),
                ERR_BAL_REDEEM
            );
        });

        it("should revert if user does not have enough optionToken tokens", async () => {
            await trader.safeMint(optionToken.address, ONE_ETHER, Bob);
            await optionToken.transfer(
                Alice,
                await optionToken.balanceOf(Bob),
                {
                    from: Bob,
                }
            );
            await truffleAssert.reverts(
                trader.safeClose(optionToken.address, ONE_ETHER, Bob, {
                    from: Bob,
                }),
                ERR_BAL_PRIME
            );
        });

        it("should revert if calling unwind and not expired", async () => {
            await truffleAssert.reverts(
                trader.safeUnwind(optionToken.address, ONE_ETHER, Alice, {
                    from: Alice,
                }),
                ERR_NOT_EXPIRED
            );
        });

        it("should close consecutively", async () => {
            await safeMint(TEN_ETHER);
            await safeClose(ONE_ETHER);
            await safeClose(FIVE_ETHER);
            await safeClose(toWei("2.5433451"));
        });
    });

    describe("full test", () => {
        beforeEach(async () => {
            trader = await Trader.new(weth.address);
            await underlyingToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await strikeToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await optionToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await redeemToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
        });

        it("should handle multiple transactions", async () => {
            // Start with 1000 s
            await underlyingToken.mint(Alice, THOUSAND_ETHER);
            await safeMint(THOUSAND_ETHER);

            await safeClose(ONE_ETHER);
            await safeExercise(toWei("200"));
            await safeRedeem(toWei("0.1"));
            await safeClose(ONE_ETHER);
            await safeExercise(ONE_ETHER);
            await safeExercise(ONE_ETHER);
            await safeExercise(ONE_ETHER);
            await safeExercise(ONE_ETHER);
            await safeRedeem(toWei("0.23"));
            await safeRedeem(toWei("0.1234"));
            await safeRedeem(toWei("0.15"));
            await safeRedeem(toWei("0.2543"));
            await safeClose(FIVE_ETHER);
            await safeClose(await optionToken.balanceOf(Alice));
            await safeRedeem(await redeemToken.balanceOf(Alice));

            let balanceP = new BN(await optionToken.balanceOf(Alice));
            let balanceR = new BN(await redeemToken.balanceOf(Alice));

            assertBNEqual(balanceP, 0);
            assertBNEqual(balanceR, 0);
        });
    });

    describe("safeUnwind", () => {
        beforeEach(async () => {
            trader = await Trader.new(weth.address);
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
            redeemTokenTokenAddress = redeemToken.address;

            await underlyingToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await strikeToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await optionToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await redeemToken.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });

            await underlyingToken.approve(trader.address, MILLION_ETHER, {
                from: Bob,
            });
            await strikeToken.approve(trader.address, MILLION_ETHER, {
                from: Bob,
            });
            await optionToken.approve(trader.address, MILLION_ETHER, {
                from: Bob,
            });
            await redeemToken.approve(trader.address, MILLION_ETHER, {
                from: Bob,
            });

            let inTokenU = THOUSAND_ETHER;
            await underlyingToken.mint(Alice, inTokenU);
            await trader.safeMint(optionToken.address, inTokenU, Alice);
            await underlyingToken.mint(Bob, ONE_ETHER);
            await trader.safeMint(optionToken.address, ONE_ETHER, Bob, {
                from: Bob,
            });

            let expired = "1589386232";
            await optionToken.setExpiry(expired);
            assert.equal(await optionToken.expiry(), expired);

            safeUnwind = async (inTokenP) => {
                inTokenP = new BN(inTokenP);
                let inTokenR = inTokenP.mul(new BN(quote)).div(new BN(base));
                let outTokenU = inTokenP;

                let balanceU = await getBalance(underlyingToken, Alice);
                let balanceP = await getBalance(optionToken, Alice);
                let balanceR = await getBalance(redeemToken, Alice);

                let event = await trader.safeUnwind(
                    optionToken.address,
                    inTokenP,
                    Alice
                );

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
                assertBNEqual(deltaP, new BN(0));
                assertBNEqual(deltaR, inTokenR.neg());

                await truffleAssert.eventEmitted(
                    event,
                    "TraderUnwind",
                    (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.inTokenP.toString()).to.be.eq(
                                inTokenP.toString()
                            ) &&
                            expect(ev.inTokenP.toString()).to.be.eq(
                                outTokenU.toString()
                            )
                        );
                    }
                );
            };
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeUnwind(optionToken.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough redeemToken tokens", async () => {
            await redeemToken.transfer(
                Bob,
                await redeemToken.balanceOf(Alice),
                {
                    from: Alice,
                }
            );
            await truffleAssert.reverts(
                trader.safeUnwind(optionToken.address, ONE_ETHER, Alice, {
                    from: Alice,
                }),
                ERR_BAL_REDEEM
            );
        });

        it("should unwind consecutively", async () => {
            await safeUnwind(toWei("0.4351"));
            await safeUnwind(ONE_ETHER);
            await safeUnwind(toWei("2.5433451"));
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
            let inTokenU = THOUSAND_ETHER;
            await underlyingToken.mint(Alice, inTokenU);
            await strikeToken.mint(Alice, inTokenU);
            await underlyingToken.transfer(optionToken.address, inTokenU);
            await optionToken.mint(Alice);
        });

        it("should revert on mint because transfer does not return a boolean", async () => {
            let inTokenP = HUNDRED_ETHER;
            await truffleAssert.reverts(
                trader.safeMint(optionToken.address, inTokenP, Alice)
            );
        });

        it("should revert on swap because transfer does not return a boolean", async () => {
            let inTokenP = HUNDRED_ETHER;
            await truffleAssert.reverts(
                trader.safeExercise(optionToken.address, inTokenP, Alice)
            );
        });

        it("should revert on redeemToken because transfer does not return a boolean", async () => {
            // no way to swap, because it reverts, so we need to send strikeToken and call update()
            let inTokenS = toWei("0.5"); // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
            await strikeToken.transfer(optionToken.address, inTokenS);
            await optionToken.update();
            await truffleAssert.reverts(
                trader.safeRedeem(optionToken.address, inTokenS, Alice)
            );
        });

        it("should revert on close because transfer does not return a boolean", async () => {
            let inTokenP = HUNDRED_ETHER;
            await truffleAssert.reverts(
                trader.safeClose(optionToken.address, inTokenP, Alice)
            );
        });

        it("should revert on unwind because its not expired yet", async () => {
            let inTokenP = HUNDRED_ETHER;
            await truffleAssert.reverts(
                trader.safeUnwind(optionToken.address, inTokenP, Alice)
            );
        });
    });
});
