const { assert, expect } = require("chai");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const utils = require("./lib/utils");
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { parseEther } = require("ethers/lib/utils");
const { assertBNEqual, verifyOptionInvariants, getTokenBalance } = utils;
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
    newTrader,
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
    ERR_BAL_OPTIONS,
    ERR_BAL_REDEEM,
    ERR_NOT_EXPIRED,
} = constants.ERR_CODES;

describe("Trader", () => {
    // ACCOUNTS
    let signers, Admin, User, Alice, Bob;

    let trader, weth, dai, optionToken, redeemToken;
    let underlyingToken, strikeToken;
    let base, quote, expiry;
    let Primitive, registry;

    before(async () => {
        signers = await newWallets();
        Admin = signers[0];
        User = signers[1];
        Alice = Admin._address;
        Bob = User._address;
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
        trader = await newTrader(Admin, weth.address);
    });

    describe("Constructor", () => {
        it("should return the correct weth address", async () => {
            expect(await trader.weth()).to.be.equal(weth.address);
        });
    });

    describe("safeMint", () => {
        beforeEach(async () => {
            trader = await newTrader(Admin, weth.address);
            await underlyingToken
                .connect(Admin)
                .approve(trader.address, MILLION_ETHER);
            await strikeToken
                .connect(Admin)
                .approve(trader.address, MILLION_ETHER);

            safeMint = async (inTokenU) => {
                let outTokenR = inTokenU.mul(quote).div(base);

                let balanceU = await getTokenBalance(underlyingToken, Alice);
                let balanceP = await getTokenBalance(optionToken, Alice);
                let balanceR = await getTokenBalance(redeemToken, Alice);

                await expect(
                    trader.safeMint(optionToken.address, inTokenU, Alice)
                )
                    .to.emit(trader, "TraderMint")
                    .withArgs(
                        Alice,
                        optionToken.address,
                        inTokenU.toString(),
                        outTokenR.toString()
                    );

                let deltaU = (
                    await getTokenBalance(underlyingToken, Alice)
                ).sub(balanceU);
                let deltaP = (await getTokenBalance(optionToken, Alice)).sub(
                    balanceP
                );
                let deltaR = (await getTokenBalance(redeemToken, Alice)).sub(
                    balanceR
                );

                assertBNEqual(deltaU, inTokenU.mul(-1));
                assertBNEqual(deltaP, inTokenU);
                assertBNEqual(deltaR, outTokenR);
            };
        });

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeMint(optionToken.address, 0, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should revert if optionToken.address is not an option ", async () => {
            await expect(trader.safeMint(Alice, 10, Alice)).to.be.reverted;
        });

        it("should revert if msg.sender does not have enough underlyingToken for tx", async () => {
            await expect(
                trader
                    .connect(User)
                    .safeMint(optionToken.address, MILLION_ETHER, Alice)
            ).to.be.revertedWith(ERR_BAL_UNDERLYING);
        });

        it("should emit the mint event", async () => {
            let inTokenU = ONE_ETHER;
            let outTokenR = inTokenU.mul(quote).div(base);
            await expect(trader.safeMint(optionToken.address, inTokenU, Alice))
                .to.emit(trader, "TraderMint")
                .withArgs(
                    Alice,
                    optionToken.address,
                    inTokenU.toString(),
                    outTokenR.toString()
                );
        });

        it("should mint optionTokens and redeemTokens in correct amounts", async () => {
            await safeMint(ONE_ETHER);
        });

        it("should successfully call safe mint a few times in a row", async () => {
            await safeMint(ONE_ETHER);
            await safeMint(TEN_ETHER);
            await safeMint(FIVE_ETHER);
            await safeMint(parseEther("0.5123542351"));
            await safeMint(parseEther("1.23526231124324"));
            await safeMint(parseEther("2.234345"));
        });
    });

    describe("safeExercise", () => {
        beforeEach(async () => {
            trader = await newTrader(Admin, weth.address);
            await underlyingToken.approve(trader.address, MILLION_ETHER);
            await strikeToken.approve(trader.address, MILLION_ETHER);
            await optionToken.approve(trader.address, MILLION_ETHER);
            await safeMint(TEN_ETHER);

            safeExercise = async (inTokenU) => {
                inTokenU = inTokenU;
                let inTokenP = inTokenU;
                let inTokenS = inTokenU.mul(quote).div(base);

                let balanceU = await getTokenBalance(underlyingToken, Alice);
                let balanceP = await getTokenBalance(optionToken, Alice);
                let balanceS = await getTokenBalance(strikeToken, Alice);

                await expect(
                    trader.safeExercise(optionToken.address, inTokenU, Alice)
                )
                    .to.emit(trader, "TraderExercise")
                    .withArgs(
                        Alice,
                        optionToken.address,
                        inTokenU.toString(),
                        inTokenS.toString()
                    );

                let deltaU = (
                    await getTokenBalance(underlyingToken, Alice)
                ).sub(balanceU);
                let deltaP = (await getTokenBalance(optionToken, Alice)).sub(
                    balanceP
                );
                let deltaS = (await getTokenBalance(strikeToken, Alice)).sub(
                    balanceS
                );

                assertBNEqual(deltaU, inTokenU);
                assertBNEqual(deltaP, inTokenP.mul(-1));
                assertBNEqual(deltaS, inTokenS.mul(-1));

                await verifyOptionInvariants(
                    underlyingToken,
                    strikeToken,
                    optionToken,
                    redeemToken
                );
            };
        });

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeExercise(optionToken.address, 0, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should revert if user does not have enough optionToken tokens", async () => {
            await expect(
                trader.safeExercise(optionToken.address, MILLION_ETHER, Alice)
            ).to.be.revertedWith(ERR_BAL_OPTIONS);
        });

        it("should revert if user does not have enough strike tokens", async () => {
            await trader.safeMint(optionToken.address, ONE_ETHER, Bob);
            await strikeToken
                .connect(User)
                .transfer(Alice, await strikeToken.balanceOf(Bob));
            await expect(
                trader
                    .connect(User)
                    .safeExercise(optionToken.address, ONE_ETHER, Bob)
            ).to.be.revertedWith(ERR_BAL_STRIKE);
        });

        it("should exercise consecutively", async () => {
            await strikeToken.deposit({
                from: Alice,
                value: TEN_ETHER,
            });
            await safeExercise(parseEther("0.1"));
            await safeExercise(parseEther("0.32525"));
            await safeExercise(ONE_ETHER);
        });
    });

    describe("safeRedeem", () => {
        beforeEach(async () => {
            trader = await newTrader(Admin, weth.address);
            await underlyingToken.approve(trader.address, MILLION_ETHER);
            await strikeToken.approve(trader.address, MILLION_ETHER);
            await optionToken.approve(trader.address, MILLION_ETHER);
            await redeemToken.approve(trader.address, MILLION_ETHER);
            await safeMint(parseEther("200"));

            safeRedeem = async (inTokenR) => {
                let outTokenS = inTokenR;

                let balanceR = await getTokenBalance(redeemToken, Alice);
                let balanceS = await getTokenBalance(strikeToken, Alice);

                await expect(
                    trader.safeRedeem(optionToken.address, inTokenR, Alice)
                )
                    .to.emit(trader, "TraderRedeem")
                    .withArgs(Alice, optionToken.address, inTokenR.toString());

                let deltaR = (await getTokenBalance(redeemToken, Alice)).sub(
                    balanceR
                );
                let deltaS = (await getTokenBalance(strikeToken, Alice)).sub(
                    balanceS
                );

                assertBNEqual(deltaR, inTokenR.mul(-1));
                assertBNEqual(deltaS, outTokenS);

                await verifyOptionInvariants(
                    underlyingToken,
                    strikeToken,
                    optionToken,
                    redeemToken
                );
            };
        });

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeRedeem(optionToken.address, 0, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should revert if user does not have enough redeemToken tokens", async () => {
            await expect(
                trader.safeRedeem(optionToken.address, MILLION_ETHER, Alice)
            ).to.be.revertedWith(ERR_BAL_REDEEM);
        });

        it("should revert if  contract does not have enough strike tokens", async () => {
            await expect(
                trader.safeRedeem(optionToken.address, ONE_ETHER, Alice)
            ).to.be.revertedWith(ERR_BAL_STRIKE);
        });

        it("should redeemToken consecutively", async () => {
            await safeExercise(parseEther("200"));
            await safeRedeem(parseEther("0.1"));
            await safeRedeem(parseEther("0.32525"));
            await safeRedeem(parseEther("0.5"));
        });
    });

    describe("safeClose", () => {
        beforeEach(async () => {
            trader = await newTrader(Admin, weth.address);
            await underlyingToken.approve(trader.address, MILLION_ETHER);
            await strikeToken.approve(trader.address, MILLION_ETHER);
            await optionToken.approve(trader.address, MILLION_ETHER);
            await redeemToken.approve(trader.address, MILLION_ETHER);
            await safeMint(parseEther("1"));

            safeClose = async (inTokenP) => {
                let inTokenR = inTokenP.mul(quote).div(base);
                let outTokenU = inTokenP;

                let balanceU = await getTokenBalance(underlyingToken, Alice);
                let balanceP = await getTokenBalance(optionToken, Alice);
                let balanceR = await getTokenBalance(redeemToken, Alice);

                await expect(
                    trader.safeClose(optionToken.address, inTokenP, Alice)
                )
                    .to.emit(trader, "TraderClose")
                    .withArgs(Alice, optionToken.address, inTokenP.toString());

                let deltaU = (
                    await getTokenBalance(underlyingToken, Alice)
                ).sub(balanceU);
                let deltaP = (await getTokenBalance(optionToken, Alice)).sub(
                    balanceP
                );
                let deltaR = (await getTokenBalance(redeemToken, Alice)).sub(
                    balanceR
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

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeClose(optionToken.address, 0, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should revert if user does not have enough redeemToken tokens", async () => {
            await trader.safeMint(optionToken.address, ONE_ETHER, Bob);
            await redeemToken
                .connect(User)
                .transfer(Alice, await redeemToken.balanceOf(Bob));
            await expect(
                trader
                    .connect(User)
                    .safeClose(optionToken.address, ONE_ETHER, Bob)
            ).to.be.revertedWith(ERR_BAL_REDEEM);
        });

        it("should revert if user does not have enough optionToken tokens", async () => {
            await trader.safeMint(optionToken.address, ONE_ETHER, Bob);
            await optionToken
                .connect(User)
                .transfer(Alice, await optionToken.balanceOf(Bob));
            await expect(
                trader
                    .connect(User)
                    .safeClose(optionToken.address, ONE_ETHER, Bob)
            ).to.be.revertedWith(ERR_BAL_OPTIONS);
        });

        it("should revert if calling unwind and not expired", async () => {
            await expect(
                trader.safeUnwind(optionToken.address, ONE_ETHER, Alice)
            ).to.be.revertedWith(ERR_NOT_EXPIRED);
        });

        it("should close consecutively", async () => {
            await safeMint(TEN_ETHER);
            await safeClose(ONE_ETHER);
            await safeClose(FIVE_ETHER);
            await safeClose(parseEther("2.5433451"));
        });
    });

    describe("full test", () => {
        beforeEach(async () => {
            trader = await newTrader(Admin, weth.address);
            await underlyingToken.approve(trader.address, MILLION_ETHER);
            await strikeToken.approve(trader.address, MILLION_ETHER);
            await optionToken.approve(trader.address, MILLION_ETHER);
            await redeemToken.approve(trader.address, MILLION_ETHER);
        });

        it("should handle multiple transactions", async () => {
            // Start with 1000 s
            await underlyingToken.mint(Alice, THOUSAND_ETHER);
            await safeMint(THOUSAND_ETHER);

            await safeClose(ONE_ETHER);
            await safeExercise(parseEther("200"));
            await safeRedeem(parseEther("0.1"));
            await safeClose(ONE_ETHER);
            await safeExercise(ONE_ETHER);
            await safeExercise(ONE_ETHER);
            await safeExercise(ONE_ETHER);
            await safeExercise(ONE_ETHER);
            await safeRedeem(parseEther("0.23"));
            await safeRedeem(parseEther("0.1234"));
            await safeRedeem(parseEther("0.15"));
            await safeRedeem(parseEther("0.2543"));
            await safeClose(FIVE_ETHER);
            await safeClose(await optionToken.balanceOf(Alice));
            await safeRedeem(await redeemToken.balanceOf(Alice));

            let balanceP = await optionToken.balanceOf(Alice);
            let balanceR = await redeemToken.balanceOf(Alice);

            assertBNEqual(balanceP, 0);
            assertBNEqual(balanceR, 0);
        });
    });

    describe("safeUnwind", () => {
        beforeEach(async () => {
            trader = await newTrader(Admin, weth.address);
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
            redeemTokenTokenAddress = redeemToken.address;

            await underlyingToken.approve(trader.address, MILLION_ETHER);
            await strikeToken.approve(trader.address, MILLION_ETHER);
            await optionToken.approve(trader.address, MILLION_ETHER);
            await redeemToken.approve(trader.address, MILLION_ETHER);

            await underlyingToken
                .connect(User)
                .approve(trader.address, MILLION_ETHER);
            await strikeToken
                .connect(User)
                .approve(trader.address, MILLION_ETHER);
            await optionToken
                .connect(User)
                .approve(trader.address, MILLION_ETHER);
            await redeemToken
                .connect(User)
                .approve(trader.address, MILLION_ETHER);

            let inTokenU = THOUSAND_ETHER;
            await underlyingToken.mint(Alice, inTokenU);
            await trader.safeMint(optionToken.address, inTokenU, Alice);
            await underlyingToken.mint(Bob, ONE_ETHER);
            await trader
                .connect(User)
                .safeMint(optionToken.address, ONE_ETHER, Bob);

            let expired = "1589386232";
            await optionToken.setExpiry(expired);
            assert.equal(await optionToken.getExpiryTime(), expired);

            safeUnwind = async (inTokenP) => {
                let inTokenR = inTokenP.mul(quote).div(base);
                let outTokenU = inTokenP;

                let balanceU = await getTokenBalance(underlyingToken, Alice);
                let balanceP = await getTokenBalance(optionToken, Alice);
                let balanceR = await getTokenBalance(redeemToken, Alice);

                await expect(
                    trader.safeUnwind(optionToken.address, inTokenP, Alice)
                )
                    .to.emit(trader, "TraderUnwind")
                    .withArgs(Alice, optionToken.address, inTokenP.toString());

                let deltaU = (
                    await getTokenBalance(underlyingToken, Alice)
                ).sub(balanceU);
                let deltaP = (await getTokenBalance(optionToken, Alice)).sub(
                    balanceP
                );
                let deltaR = (await getTokenBalance(redeemToken, Alice)).sub(
                    balanceR
                );

                assertBNEqual(deltaU, outTokenU);
                assertBNEqual(deltaP, 0);
                assertBNEqual(deltaR, inTokenR.mul(-1));
            };
        });

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeUnwind(optionToken.address, 0, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should revert if user does not have enough redeemToken tokens", async () => {
            await redeemToken.transfer(
                Bob,
                await redeemToken.balanceOf(Alice),
                {
                    from: Alice,
                }
            );
            await expect(
                trader.safeUnwind(optionToken.address, ONE_ETHER, Alice, {
                    from: Alice,
                })
            ).to.be.revertedWith(ERR_BAL_REDEEM);
        });

        it("should unwind consecutively", async () => {
            await safeUnwind(parseEther("0.4351"));
            await safeUnwind(ONE_ETHER);
            await safeUnwind(parseEther("2.5433451"));
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
            let inTokenU = THOUSAND_ETHER;
            await underlyingToken.mint(Alice, inTokenU);
            await strikeToken.mint(Alice, inTokenU);
            await underlyingToken.transfer(optionToken.address, inTokenU);
            await optionToken.mintOptions(Alice);
        });

        it("should revert on mint because transfer does not return a boolean", async () => {
            let inTokenP = HUNDRED_ETHER;
            await expect(trader.safeMint(optionToken.address, inTokenP, Alice))
                .to.be.reverted;
        });

        it("should revert on swap because transfer does not return a boolean", async () => {
            let inTokenP = HUNDRED_ETHER;
            await expect(
                trader.safeExercise(optionToken.address, inTokenP, Alice)
            ).to.be.reverted;
        });

        it("should revert on redeemToken because transfer does not return a boolean", async () => {
            // no way to swap, because it reverts, so we need to send strikeToken and call update()
            let inTokenS = parseEther("0.5"); // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
            await strikeToken.transfer(optionToken.address, inTokenS);
            await optionToken.updateCacheBalances();
            await expect(
                trader.safeRedeem(optionToken.address, inTokenS, Alice)
            ).to.be.reverted;
        });

        it("should revert on close because transfer does not return a boolean", async () => {
            let inTokenP = HUNDRED_ETHER;
            await expect(trader.safeClose(optionToken.address, inTokenP, Alice))
                .to.be.reverted;
        });

        it("should revert on unwind because its not expired yet", async () => {
            let inTokenP = HUNDRED_ETHER;
            await expect(
                trader.safeUnwind(optionToken.address, inTokenP, Alice)
            ).to.be.reverted;
        });
    });
});
