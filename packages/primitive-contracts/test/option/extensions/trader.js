const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const Trader = artifacts.require("Trader");
const utils = require("../../lib/utils");
const setup = require("../../lib/setup");
const constants = require("../../lib/constants");
const { toWei, assertBNEqual, verifyOptionInvariants } = utils;
const {
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

const OptionTest = artifacts.require("OptionTest");

contract("Trader", (accounts) => {
    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let trader, weth, dai, prime, redeem;
    let tokenU, tokenS;
    let base, quote, expiry;
    let factory, Primitive, registry;

    before(async () => {
        weth = await newWeth();
        dai = await newERC20("TEST DAI", "DAI", THOUSAND_ETHER);
        factory = await newRegistry();
        factoryOption = await newOptionFactory(factory);

        tokenU = dai;
        tokenS = weth;
        base = toWei("200");
        quote = toWei("1");
        expiry = "1690868800"; // May 30, 2020, 8PM UTC

        Primitive = await newPrimitive(
            factory,
            tokenU,
            tokenS,
            base,
            quote,
            expiry
        );

        prime = Primitive.prime;
        redeem = Primitive.redeem;
        trader = await Trader.new(weth.address);

        tokenU = dai;
        tokenS = weth;

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
            await tokenU.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await tokenS.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });

            safeMint = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let outTokenR = inTokenU.mul(new BN(quote)).div(new BN(base));

                let balanceU = await getBalance(tokenU, Alice);
                let balanceP = await getBalance(prime, Alice);
                let balanceR = await getBalance(redeem, Alice);

                let mint = await trader.safeMint(
                    prime.address,
                    inTokenU,
                    Alice
                );

                let deltaU = (await getBalance(tokenU, Alice)).sub(balanceU);
                let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                let deltaR = (await getBalance(redeem, Alice)).sub(balanceR);

                assertBNEqual(deltaU, inTokenU.neg());
                assertBNEqual(deltaP, inTokenU);
                assertBNEqual(deltaR, outTokenR);

                await truffleAssert.eventEmitted(mint, "Mint", (ev) => {
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
                trader.safeMint(prime.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if prime.address is not a ", async () => {
            await truffleAssert.reverts(trader.safeMint(Alice, 10, Alice));
        });

        it("should revert if msg.sender does not have enough tokenU for tx", async () => {
            await truffleAssert.reverts(
                trader.safeMint(prime.address, MILLION_ETHER, Alice),
                ERR_BAL_UNDERLYING
            );
        });

        it("should emit the mint event", async () => {
            let inTokenU = new BN(ONE_ETHER);
            let outTokenR = inTokenU.mul(new BN(quote)).div(new BN(base));
            let mint = await trader.safeMint(prime.address, inTokenU, Alice);
            await truffleAssert.eventEmitted(mint, "Mint", (ev) => {
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

        it("should mint primes and redeems in correct amounts", async () => {
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
            await tokenU.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await tokenS.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await safeMint(TEN_ETHER);

            safeExercise = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let inTokenP = inTokenU;
                let inTokenS = inTokenU.mul(new BN(quote)).div(new BN(base));

                let balanceU = await getBalance(tokenU, Alice);
                let balanceP = await getBalance(prime, Alice);
                let balanceS = await getBalance(tokenS, Alice);

                let exercise = await trader.safeExercise(
                    prime.address,
                    inTokenU,
                    Alice
                );

                let deltaU = (await getBalance(tokenU, Alice)).sub(balanceU);
                let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                let deltaS = (await getBalance(tokenS, Alice)).sub(balanceS);

                assertBNEqual(deltaU, inTokenU);
                assertBNEqual(deltaP, inTokenP.neg());
                assertBNEqual(
                    deltaS,
                    inTokenS.add(inTokenS.div(new BN(1000))).neg()
                );

                await truffleAssert.eventEmitted(exercise, "Exercise", (ev) => {
                    return (
                        expect(ev.from).to.be.eq(Alice) &&
                        expect(ev.outTokenU.toString()).to.be.eq(
                            inTokenU.toString()
                        ) &&
                        expect(ev.inTokenS.toString()).to.be.eq(
                            inTokenS.add(inTokenS.div(new BN(1000))).toString()
                        )
                    );
                });
                await verifyOptionInvariants(tokenU, tokenS, prime, redeem);
            };
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeExercise(prime.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough prime tokens", async () => {
            await truffleAssert.reverts(
                trader.safeExercise(prime.address, MILLION_ETHER, Alice)
            );
        });

        it("should revert if user does not have enough strike tokens", async () => {
            await trader.safeMint(prime.address, ONE_ETHER, Bob);
            await tokenS.transfer(Alice, await tokenS.balanceOf(Bob), {
                from: Bob,
            });
            await truffleAssert.reverts(
                trader.safeExercise(prime.address, ONE_ETHER, Bob, {
                    from: Bob,
                }),
                ERR_BAL_STRIKE
            );
        });

        it("should exercise consecutively", async () => {
            await tokenS.deposit({
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
            await tokenU.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await tokenS.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(trader.address, MILLION_ETHER, { from: Alice });
            await redeem.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await safeMint(toWei("200"));

            safeRedeem = async (inTokenR) => {
                inTokenR = new BN(inTokenR);
                let outTokenS = inTokenR;

                let balanceR = await getBalance(redeem, Alice);
                let balanceS = await getBalance(tokenS, Alice);

                let event = await trader.safeRedeem(
                    prime.address,
                    inTokenR,
                    Alice
                );

                let deltaR = (await getBalance(redeem, Alice)).sub(balanceR);
                let deltaS = (await getBalance(tokenS, Alice)).sub(balanceS);

                assertBNEqual(deltaR, inTokenR.neg());
                assertBNEqual(deltaS, outTokenS);

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
                await verifyOptionInvariants(tokenU, tokenS, prime, redeem);
            };
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeRedeem(prime.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough redeem tokens", async () => {
            await truffleAssert.reverts(
                trader.safeRedeem(prime.address, MILLION_ETHER, Alice),
                ERR_BAL_REDEEM
            );
        });

        it("should revert if  contract does not have enough strike tokens", async () => {
            await truffleAssert.reverts(
                trader.safeRedeem(prime.address, ONE_ETHER, Alice),
                ERR_BAL_STRIKE
            );
        });

        it("should redeem consecutively", async () => {
            await safeExercise(toWei("200"));
            await safeRedeem(toWei("0.1"));
            await safeRedeem(toWei("0.32525"));
            await safeRedeem(toWei("0.5"));
        });
    });

    describe("safeClose", () => {
        beforeEach(async () => {
            trader = await Trader.new(weth.address);
            await tokenU.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await tokenS.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(trader.address, MILLION_ETHER, { from: Alice });
            await redeem.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await safeMint(toWei("1"));

            safeClose = async (inTokenP) => {
                inTokenP = new BN(inTokenP);
                let inTokenR = inTokenP.mul(new BN(quote)).div(new BN(base));
                let outTokenU = inTokenP;

                let balanceU = await getBalance(tokenU, Alice);
                let balanceP = await getBalance(prime, Alice);
                let balanceR = await getBalance(redeem, Alice);

                let event = await trader.safeClose(
                    prime.address,
                    inTokenP,
                    Alice
                );

                let deltaU = (await getBalance(tokenU, Alice)).sub(balanceU);
                let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                let deltaR = (await getBalance(redeem, Alice)).sub(balanceR);

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
                await verifyOptionInvariants(tokenU, tokenS, prime, redeem);
            };
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeClose(prime.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough redeem tokens", async () => {
            await trader.safeMint(prime.address, ONE_ETHER, Bob);
            await redeem.transfer(Alice, await redeem.balanceOf(Bob), {
                from: Bob,
            });
            await truffleAssert.reverts(
                trader.safeClose(prime.address, ONE_ETHER, Bob, {
                    from: Bob,
                }),
                ERR_BAL_REDEEM
            );
        });

        it("should revert if user does not have enough prime tokens", async () => {
            await trader.safeMint(prime.address, ONE_ETHER, Bob);
            await prime.transfer(Alice, await prime.balanceOf(Bob), {
                from: Bob,
            });
            await truffleAssert.reverts(
                trader.safeClose(prime.address, ONE_ETHER, Bob, { from: Bob }),
                ERR_BAL_PRIME
            );
        });

        it("should revert if calling unwind and not expired", async () => {
            await truffleAssert.reverts(
                trader.safeUnwind(prime.address, ONE_ETHER, Alice, {
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
            await tokenU.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await tokenS.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(trader.address, MILLION_ETHER, { from: Alice });
            await redeem.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
        });

        it("should handle multiple transactions", async () => {
            // Start with 1000 s
            await tokenU.mint(Alice, THOUSAND_ETHER);
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
            await safeClose(await prime.balanceOf(Alice));
            await safeRedeem(await redeem.balanceOf(Alice));

            let balanceP = new BN(await prime.balanceOf(Alice));
            let balanceR = new BN(await redeem.balanceOf(Alice));

            assertBNEqual(balanceP, 0);
            assertBNEqual(balanceR, 0);
        });
    });

    describe("safeUnwind", () => {
        beforeEach(async () => {
            trader = await Trader.new(weth.address);
            prime = await newTestOption(
                tokenU.address,
                tokenS.address,
                base,
                quote,
                expiry
            );
            redeem = await newTestRedeem(Alice, prime.address, tokenU.address);
            await prime.setTokenR(redeem.address);
            tokenR = redeem.address;

            await tokenU.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await tokenS.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });
            await prime.approve(trader.address, MILLION_ETHER, { from: Alice });
            await redeem.approve(trader.address, MILLION_ETHER, {
                from: Alice,
            });

            await tokenU.approve(trader.address, MILLION_ETHER, {
                from: Bob,
            });
            await tokenS.approve(trader.address, MILLION_ETHER, {
                from: Bob,
            });
            await prime.approve(trader.address, MILLION_ETHER, { from: Bob });
            await redeem.approve(trader.address, MILLION_ETHER, {
                from: Bob,
            });

            let inTokenU = THOUSAND_ETHER;
            await tokenU.mint(Alice, inTokenU);
            await trader.safeMint(prime.address, inTokenU, Alice);
            await tokenU.mint(Bob, ONE_ETHER);
            await trader.safeMint(prime.address, ONE_ETHER, Bob, { from: Bob });

            let expired = "1589386232";
            await prime.setExpiry(expired);
            assert.equal(await prime.expiry(), expired);

            safeUnwind = async (inTokenP) => {
                inTokenP = new BN(inTokenP);
                let inTokenR = inTokenP.mul(new BN(quote)).div(new BN(base));
                let outTokenU = inTokenP;

                let balanceU = await getBalance(tokenU, Alice);
                let balanceP = await getBalance(prime, Alice);
                let balanceR = await getBalance(redeem, Alice);

                let event = await trader.safeUnwind(
                    prime.address,
                    inTokenP,
                    Alice
                );

                let deltaU = (await getBalance(tokenU, Alice)).sub(balanceU);
                let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                let deltaR = (await getBalance(redeem, Alice)).sub(balanceR);

                assertBNEqual(deltaU, outTokenU);
                assertBNEqual(deltaP, new BN(0));
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
            };
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeUnwind(prime.address, 0, Alice),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough redeem tokens", async () => {
            await redeem.transfer(Bob, await redeem.balanceOf(Alice), {
                from: Alice,
            });
            await truffleAssert.reverts(
                trader.safeUnwind(prime.address, ONE_ETHER, Alice, {
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
            tokenU = await newBadERC20("Bad ERC20 Doesnt Return Bools", "BADU");
            tokenS = await newBadERC20("Bad ERC20 Doesnt Return Bools", "BADS");
            prime = await newTestOption(
                tokenU.address,
                tokenS.address,
                base,
                quote,
                expiry
            );
            redeem = await newTestRedeem(Alice, prime.address, tokenU.address);
            await prime.setTokenR(redeem.address);
            let inTokenU = THOUSAND_ETHER;
            await tokenU.mint(Alice, inTokenU);
            await tokenS.mint(Alice, inTokenU);
            await tokenU.transfer(prime.address, inTokenU);
            await prime.mint(Alice);
        });

        it("should revert on mint because transfer does not return a boolean", async () => {
            let inTokenP = HUNDRED_ETHER;
            await truffleAssert.reverts(
                trader.safeMint(prime.address, inTokenP, Alice)
            );
        });

        it("should revert on swap because transfer does not return a boolean", async () => {
            let inTokenP = HUNDRED_ETHER;
            await truffleAssert.reverts(
                trader.safeExercise(prime.address, inTokenP, Alice)
            );
        });

        it("should revert on redeem because transfer does not return a boolean", async () => {
            // no way to swap, because it reverts, so we need to send tokenS and call update()
            let inTokenS = toWei("0.5"); // 100 ether (tokenU:base) / 200 (tokenS:quote) = 0.5 tokenS
            await tokenS.transfer(prime.address, inTokenS);
            await prime.update();
            await truffleAssert.reverts(
                trader.safeRedeem(prime.address, inTokenS, Alice)
            );
        });

        it("should revert on close because transfer does not return a boolean", async () => {
            let inTokenP = HUNDRED_ETHER;
            await truffleAssert.reverts(
                trader.safeClose(prime.address, inTokenP, Alice)
            );
        });

        it("should revert on unwind because its not expired yet", async () => {
            let inTokenP = HUNDRED_ETHER;
            await truffleAssert.reverts(
                trader.safeUnwind(prime.address, inTokenP, Alice)
            );
        });
    });
});
