// Testing suite tools
const { assert, expect } = require("chai");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

// Convert to wei
const { parseEther, formatEther } = require("ethers/lib/utils");

// Helper functions and constants
const utils = require("./lib/utils");
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { assertWithinError, verifyOptionInvariants, getTokenBalance } = utils;

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

describe("EthTrader", () => {
    // Accounts
    let Admin, User, Alice, Bob;

    // Tokens
    let weth, dai, optionToken, redeemToken;

    // Option Parameters
    let underlyingToken, strikeToken, base, quote, expiry;

    // Periphery and Administrative contracts
    let registry, trader;

    before(async () => {
        let signers = await setup.newWallets();

        // Signers
        Admin = signers[0];
        User = signers[1];

        // Addresses of Signers
        Alice = Admin._address;
        Bob = User._address;

        // Underlying and quote token instances
        weth = await setup.newWeth(Admin);
        dai = await setup.newERC20(Admin, "TEST DAI", "DAI", MILLION_ETHER);

        // Administrative contract instances
        registry = await setup.newRegistry(Admin);

        // Option Parameters
        underlyingToken = weth;
        strikeToken = dai;
        base = parseEther("200").toString();
        quote = parseEther("1").toString();
        expiry = "1690868800";

        // Option and Redeem token instances for parameters
        Primitive = await setup.newPrimitive(
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

        // Trader contract instance
        trader = await setup.newEthTrader(Admin, weth.address);

        // Approve tokens for trader to use
        await underlyingToken.approve(trader.address, MILLION_ETHER);
        await strikeToken.approve(trader.address, MILLION_ETHER);
        await optionToken.approve(trader.address, MILLION_ETHER);
        await redeemToken.approve(trader.address, MILLION_ETHER);
    });

    describe("Constructor", () => {
        it("should return the correct weth address", async () => {
            expect(await trader.weth()).to.be.equal(weth.address);
        });
    });

    describe("safeMintWithETH", () => {
        safeMintWithETH = async (inputUnderlyings) => {
            // Calculate the strike price of each unit of underlying token
            let outputRedeems = inputUnderlyings.mul(quote).div(base);

            let underlyingBal = await Admin.getBalance();
            let optionBal = await getTokenBalance(optionToken, Alice);
            let redeemBal = await getTokenBalance(redeemToken, Alice);

            let gasUsed = await Admin.estimateGas(
                trader.safeMintWithETH(optionToken.address, Alice, {
                    value: inputUnderlyings,
                })
            );

            await expect(
                trader.safeMintWithETH(optionToken.address, Alice, {
                    value: inputUnderlyings,
                })
            )
                .to.emit(trader, "EthTraderMint")
                .withArgs(
                    Alice,
                    optionToken.address,
                    inputUnderlyings.toString(),
                    outputRedeems.toString()
                );

            let underlyingsChange = (await Admin.getBalance())
                .sub(underlyingBal)
                .add(gasUsed);
            let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(
                optionBal
            );
            let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(
                redeemBal
            );

            assertWithinError(underlyingsChange, inputUnderlyings.mul(-1));
            assertWithinError(optionsChange, inputUnderlyings);
            assertWithinError(redeemsChange, outputRedeems);

            await verifyOptionInvariants(
                underlyingToken,
                strikeToken,
                optionToken,
                redeemToken
            );
        };

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeMintWithETH(optionToken.address, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should revert if optionToken.address is not an option ", async () => {
            await expect(trader.safeMintWithETH(Alice, Alice, { value: 10 })).to
                .be.reverted;
        });

        it("should emit the mint event", async () => {
            let inputUnderlyings = ONE_ETHER;
            let outputRedeems = inputUnderlyings.mul(quote).div(base);
            await expect(
                trader.safeMintWithETH(optionToken.address, Alice, {
                    value: inputUnderlyings,
                })
            )
                .to.emit(trader, "EthTraderMint")
                .withArgs(
                    Alice,
                    optionToken.address,
                    inputUnderlyings.toString(),
                    outputRedeems.toString()
                );
        });

        it("should mint optionTokens and redeemTokens in correct amounts", async () => {
            await safeMintWithETH(ONE_ETHER);
        });

        it("should successfully call safe mint a few times in a row", async () => {
            await safeMintWithETH(ONE_ETHER);
            await safeMintWithETH(TEN_ETHER);
            await safeMintWithETH(FIVE_ETHER);
            await safeMintWithETH(parseEther("0.5123542351"));
            await safeMintWithETH(parseEther("1.23526231124324"));
            await safeMintWithETH(parseEther("2.234345"));
        });
    });

    describe("safeExerciseForETH", () => {
        beforeEach(async () => {
            await safeMintWithETH(TEN_ETHER);
        });

        safeExerciseForETH = async (inputUnderlyings) => {
            // Options:Underlyings are always at a 1:1 ratio.
            let inputOptions = inputUnderlyings;
            // Calculate the amount of strike tokens necessary to exercise
            let inputStrikes = inputUnderlyings.mul(quote).div(base);

            let underlyingBal = await Admin.getBalance();
            let optionBal = await getTokenBalance(optionToken, Alice);
            let strikeBal = await getTokenBalance(strikeToken, Alice);

            await expect(
                trader.safeExerciseForETH(
                    optionToken.address,
                    inputUnderlyings,
                    Alice
                )
            )
                .to.emit(trader, "EthTraderExercise")
                .withArgs(
                    Alice,
                    optionToken.address,
                    inputUnderlyings.toString(),
                    inputStrikes.toString()
                );

            let underlyingsChange = (await Admin.getBalance()).sub(
                underlyingBal
            );
            let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(
                optionBal
            );
            let strikesChange = (await getTokenBalance(strikeToken, Alice)).sub(
                strikeBal
            );

            assertWithinError(underlyingsChange, inputUnderlyings);
            assertWithinError(optionsChange, inputOptions.mul(-1));
            assertWithinError(strikesChange, inputStrikes.mul(-1));

            await verifyOptionInvariants(
                underlyingToken,
                strikeToken,
                optionToken,
                redeemToken
            );
        };

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeExerciseForETH(optionToken.address, 0, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should revert if user does not have enough optionToken tokens", async () => {
            await expect(
                trader.safeExerciseForETH(
                    optionToken.address,
                    MILLION_ETHER,
                    Alice
                )
            ).to.be.revertedWith(ERR_BAL_OPTIONS);
        });

        it("should revert if user does not have enough strike tokens", async () => {
            await trader.safeMintWithETH(optionToken.address, Bob, {
                value: ONE_ETHER,
            });
            await strikeToken
                .connect(User)
                .transfer(Alice, await strikeToken.balanceOf(Bob));
            await expect(
                trader
                    .connect(User)
                    .safeExerciseForETH(optionToken.address, ONE_ETHER, Bob)
            ).to.be.revertedWith(ERR_BAL_STRIKE);
        });

        it("should exercise consecutively", async () => {
            await strikeToken.mint(Alice, TEN_ETHER);
            await safeExerciseForETH(parseEther("0.1"));
            await safeExerciseForETH(parseEther("0.32525"));
            await safeExerciseForETH(ONE_ETHER);
        });
    });

    describe("safeCloseForETH", () => {
        beforeEach(async () => {
            await safeMintWithETH(parseEther("1"));
        });

        safeCloseForETH = async (inputOptions) => {
            let inputRedeems = inputOptions.mul(quote).div(base);

            let underlyingBal = await Admin.getBalance();
            let optionBal = await getTokenBalance(optionToken, Alice);
            let redeemBal = await getTokenBalance(redeemToken, Alice);

            await expect(
                trader.safeCloseForETH(optionToken.address, inputOptions, Alice)
            )
                .to.emit(trader, "EthTraderClose")
                .withArgs(Alice, optionToken.address, inputOptions.toString());

            let underlyingsChange = (await Admin.getBalance()).sub(
                underlyingBal
            );
            let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(
                optionBal
            );
            let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(
                redeemBal
            );

            assertWithinError(underlyingsChange, inputOptions);
            assertWithinError(optionsChange, inputOptions.mul(-1));
            assertWithinError(redeemsChange, inputRedeems.mul(-1));

            await verifyOptionInvariants(
                underlyingToken,
                strikeToken,
                optionToken,
                redeemToken
            );
        };

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeCloseForETH(optionToken.address, 0, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should revert if user does not have enough redeemToken tokens", async () => {
            await trader.safeMintWithETH(optionToken.address, Bob, {
                value: ONE_ETHER,
            });
            await redeemToken
                .connect(User)
                .transfer(Alice, await redeemToken.balanceOf(Bob));
            await expect(
                trader
                    .connect(User)
                    .safeCloseForETH(optionToken.address, ONE_ETHER, Bob)
            ).to.be.revertedWith(ERR_BAL_REDEEM);
        });

        it("should revert if user does not have enough optionToken tokens", async () => {
            await trader.safeMintWithETH(optionToken.address, Bob, {
                value: ONE_ETHER,
            });
            await optionToken
                .connect(User)
                .transfer(Alice, await optionToken.balanceOf(Bob));
            await expect(
                trader
                    .connect(User)
                    .safeCloseForETH(optionToken.address, ONE_ETHER, Bob)
            ).to.be.revertedWith(ERR_BAL_OPTIONS);
        });

        it("should revert if calling unwind and not expired", async () => {
            await expect(
                trader.safeUnwindForETH(optionToken.address, ONE_ETHER, Alice)
            ).to.be.revertedWith(ERR_NOT_EXPIRED);
        });

        it("should close consecutively", async () => {
            await safeMintWithETH(TEN_ETHER);
            await safeCloseForETH(ONE_ETHER);
            await safeCloseForETH(FIVE_ETHER);
            await safeCloseForETH(parseEther("2.5433451"));
        });
    });

    describe("full test", () => {
        beforeEach(async () => {
            // Deploy a new trader instance
            trader = await setup.newEthTrader(Admin, weth.address);
            // Approve the tokens that are being used
            await underlyingToken.approve(trader.address, MILLION_ETHER);
            await strikeToken.approve(trader.address, MILLION_ETHER);
            await optionToken.approve(trader.address, MILLION_ETHER);
            await redeemToken.approve(trader.address, MILLION_ETHER);
        });

        it("should handle multiple transactions", async () => {
            // Start with 1000 options
            await underlyingToken.deposit({ value: THOUSAND_ETHER });
            await safeMintWithETH(THOUSAND_ETHER);

            await safeCloseForETH(ONE_ETHER);
            await safeExerciseForETH(parseEther("200"));
            await safeCloseForETH(ONE_ETHER);
            await safeExerciseForETH(ONE_ETHER);
            await safeExerciseForETH(ONE_ETHER);
            await safeExerciseForETH(ONE_ETHER);
            await safeExerciseForETH(ONE_ETHER);
            await safeCloseForETH(FIVE_ETHER);
            await safeCloseForETH(await optionToken.balanceOf(Alice));

            // Assert option and redeem token balances are 0
            let optionBal = await optionToken.balanceOf(Alice);

            assertWithinError(optionBal, 0);
        });
    });

    describe("safeUnwindForETH", () => {
        beforeEach(async () => {
            // Sets up contract instances
            trader = await setup.newEthTrader(Admin, weth.address);
            optionToken = await setup.newTestOption(
                Admin,
                underlyingToken.address,
                strikeToken.address,
                base,
                quote,
                expiry
            );
            redeemToken = await setup.newTestRedeem(
                Admin,
                Alice,
                optionToken.address
            );

            await optionToken.setRedeemToken(redeemToken.address);

            // Approve tokens for two signer accounts
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

            // Setup initial state and make the option expired
            let inputUnderlyings = THOUSAND_ETHER;

            // Mint underlying tokens so we can use them to mint options
            await underlyingToken.deposit({ value: inputUnderlyings });
            await trader.safeMintWithETH(optionToken.address, Alice, {
                value: inputUnderlyings,
            });
            // Do the same for the other signer account
            await underlyingToken.deposit({ value: ONE_ETHER });
            await trader
                .connect(User)
                .safeMintWithETH(optionToken.address, Bob, {
                    value: ONE_ETHER,
                });

            // Expire the option and check to make sure it has the expired timestamp as a parameter
            let expired = "1589386232";
            await optionToken.setExpiry(expired);
            assert.equal(await optionToken.getExpiryTime(), expired);
        });

        safeUnwindForETH = async (inputOptions) => {
            let inputRedeems = inputOptions.mul(quote).div(base);

            let underlyingBal = await Admin.getBalance();
            let optionBal = await getTokenBalance(optionToken, Alice);
            let redeemBal = await getTokenBalance(redeemToken, Alice);

            await expect(
                trader.safeUnwindForETH(
                    optionToken.address,
                    inputOptions,
                    Alice
                )
            )
                .to.emit(trader, "EthTraderUnwind")
                .withArgs(Alice, optionToken.address, inputOptions.toString());

            let underlyingsChange = (await Admin.getBalance()).sub(
                underlyingBal
            );
            let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(
                optionBal
            );
            let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(
                redeemBal
            );

            assertWithinError(underlyingsChange, inputOptions);
            assertWithinError(optionsChange, 0);
            assertWithinError(redeemsChange, inputRedeems.mul(-1));
        };

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeUnwindForETH(optionToken.address, 0, Alice)
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
                trader.safeUnwindForETH(optionToken.address, ONE_ETHER, Alice, {
                    from: Alice,
                })
            ).to.be.revertedWith(ERR_BAL_REDEEM);
        });

        it("should unwind consecutively", async () => {
            await safeUnwindForETH(parseEther("0.4351"));
            await safeUnwindForETH(ONE_ETHER);
            await safeUnwindForETH(parseEther("2.5433"));
        });
    });

    describe("safeRedeemForETH", () => {
        before(async () => {
            // Administrative contract instances
            registry = await setup.newRegistry(Admin);
            // Option Parameters
            underlyingToken = dai;
            strikeToken = weth;
            base = parseEther("200").toString();
            quote = parseEther("1").toString();
            expiry = "1690868800";

            // Option and Redeem token instances for parameters
            Primitive = await setup.newPrimitive(
                Admin,
                registry,
                dai,
                weth,
                base,
                quote,
                expiry
            );

            optionToken = Primitive.optionToken;
            redeemToken = Primitive.redeemToken;
            await dai.transfer(optionToken.address, parseEther("2000"));
            await weth.deposit({ value: parseEther("10") });
            await optionToken.mintOptions(Alice);
            // Trader contract instance
            trader = await setup.newEthTrader(Admin, weth.address);

            // Approve tokens for trader to use
            await weth.approve(trader.address, MILLION_ETHER);
            await dai.approve(trader.address, MILLION_ETHER);
            await optionToken.approve(trader.address, MILLION_ETHER);
            await redeemToken.approve(trader.address, MILLION_ETHER);
        });

        safeRedeemForETH = async (inputRedeems) => {
            let outputStrikes = inputRedeems;

            let redeemBal = await getTokenBalance(redeemToken, Alice);
            let strikeBal = await Admin.getBalance();

            await expect(
                trader.safeRedeemForETH(
                    optionToken.address,
                    inputRedeems,
                    Alice
                )
            )
                .to.emit(trader, "EthTraderRedeem")
                .withArgs(Alice, optionToken.address, inputRedeems.toString());

            let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(
                redeemBal
            );
            let strikesChange = (await Admin.getBalance()).sub(strikeBal);

            assertWithinError(redeemsChange, inputRedeems.mul(-1));
            assertWithinError(strikesChange, outputStrikes);

            await verifyOptionInvariants(
                underlyingToken,
                strikeToken,
                optionToken,
                redeemToken
            );
        };

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeRedeemForETH(optionToken.address, 0, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should revert if user does not have enough redeemToken tokens", async () => {
            await expect(
                trader.safeRedeemForETH(
                    optionToken.address,
                    MILLION_ETHER,
                    Alice
                )
            ).to.be.revertedWith(ERR_BAL_REDEEM);
        });

        it("should revert if  contract does not have enough strike tokens", async () => {
            await expect(
                trader.safeRedeemForETH(optionToken.address, ONE_ETHER, Alice)
            ).to.be.revertedWith(ERR_BAL_STRIKE);
        });

        it("should redeemToken consecutively", async () => {
            await trader.safeExerciseWithETH(optionToken.address, Alice, {
                value: ONE_ETHER,
            });
            await safeRedeemForETH(parseEther("0.1"));
            await safeRedeemForETH(parseEther("0.32525"));
            await safeRedeemForETH(parseEther("0.5"));
        });
    });

    describe("safeExerciseWithETH", () => {
        safeExerciseWithETH = async (inputUnderlyings) => {
            // Options:Underlyings are always at a 1:1 ratio.
            let inputOptions = inputUnderlyings;
            // Calculate the amount of strike tokens necessary to exercise
            let inputStrikes = inputUnderlyings.mul(quote).div(base);

            let underlyingBal = await Admin.getBalance();
            let optionBal = await getTokenBalance(optionToken, Alice);
            let strikeBal = await getTokenBalance(strikeToken, Alice);

            await expect(
                trader.safeExerciseWithETH(optionToken.address, Alice, {
                    value: inputStrikes,
                })
            )
                .to.emit(trader, "EthTraderExercise")
                .withArgs(
                    Alice,
                    optionToken.address,
                    inputUnderlyings.toString(),
                    inputStrikes.toString()
                );

            let underlyingsChange = (await Admin.getBalance()).sub(
                underlyingBal
            );
            let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(
                optionBal
            );
            let strikesChange = (await getTokenBalance(strikeToken, Alice)).sub(
                strikeBal
            );

            assertWithinError(underlyingsChange, inputUnderlyings);
            assertWithinError(optionsChange, inputOptions.mul(-1));
            assertWithinError(strikesChange, inputStrikes.mul(-1));

            await verifyOptionInvariants(
                underlyingToken,
                strikeToken,
                optionToken,
                redeemToken
            );
        };

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeExerciseWithETH(optionToken.address, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });

        it("should exercise consecutively", async () => {
            await strikeToken.deposit({ value: TEN_ETHER });
            await safeExerciseWithETH(parseEther("0.1"));
            await safeExerciseWithETH(parseEther("0.32525"));
            await safeExerciseWithETH(ONE_ETHER);
        });
    });
});
