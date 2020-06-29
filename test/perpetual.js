const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const utils = require("./utils");
const setup = require("./setup");
const constants = require("./constants");
const {
    toWei,
    assertBNEqual,
    calculateAddLiquidity,
    withdraw,
    assertWithinError,
    verifyOptionInvariants,
} = utils;
const {
    newERC20,
    newInterestBearing,
    newPerpetual,
    newRegistry,
    newOptionFactory,
    newPrimitive,
    approveToken,
} = setup;
const {
    ZERO,
    ONE_ETHER,
    FIVE_ETHER,
    TEN_ETHER,
    HUNDRED_ETHER,
    FIFTY_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
} = constants.VALUES;

const {
    ERR_BAL_UNDERLYING,
    ERR_ZERO,
    ERR_BAL_STRIKE,
    ERR_BAL_PRIME,
} = constants.ERR_CODES;

contract("Perpetual", (accounts) => {
    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let Primitive,
        Tokens,
        Parameters,
        factory,
        perpetual,
        registry,
        factoryOption;

    before(async () => {
        // setup a factory to create the option from
        registry = await newRegistry();
        factoryOption = await newOptionFactory(registry);
        let usdc = await newERC20("Test USDC", "USDC", THOUSAND_ETHER);
        let dai = await newERC20("Test DAI", "DAI", THOUSAND_ETHER);

        // setup cToken versions of the underlyings
        let cusdc = await newInterestBearing(
            usdc.address,
            "Interest Bearing USDC",
            "cUSDC"
        );
        let cdai = await newInterestBearing(
            dai.address,
            "Interest Bearing DAI",
            "cDAI"
        );

        let base = toWei("1");
        let quote = toWei("1");
        let expiry = "7258118400";

        let Primitive = await newPrimitive(
            registry,
            usdc,
            dai,
            base,
            quote,
            expiry
        );

        // deploy the perpetual
        perpetual = await newPerpetual(
            cdai.address,
            cusdc.address,
            Primitive.prime.address,
            Alice
        );

        Tokens = {
            usdc: usdc,
            dai: dai,
            cusdc: cusdc,
            cdai: cdai,
        };

        Parameters = {
            base: base,
            quote: quote,
            expiry: expiry,
        };

        createProtocol = async () => {
            registry = await newRegistry();
            factoryOption = await newOptionFactory(registry);
            Primitive = await newPrimitive(
                registry,
                Tokens.usdc,
                Tokens.dai,
                Parameters.base,
                Parameters.quote,
                Parameters.expiry
            );
            perpetual = await newPerpetual(
                Tokens.cdai.address,
                Tokens.cusdc.address,
                Primitive.prime.address,
                Alice
            );

            await approveToken(Tokens.usdc, Alice, perpetual.address);
            await approveToken(Tokens.dai, Alice, perpetual.address);
            await approveToken(Primitive.prime, Alice, perpetual.address);
            await approveToken(Primitive.redeem, Alice, perpetual.address);
            await approveToken(Tokens.usdc, Bob, perpetual.address);
            await approveToken(Tokens.dai, Bob, perpetual.address);
            await approveToken(Primitive.prime, Bob, perpetual.address);
            await approveToken(Primitive.redeem, Bob, perpetual.address);

            return [Primitive, perpetual];
        };

        getTokenBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        };

        getTotalSupply = async (instance) => {
            let bal = new BN(await instance.totalSupply());
            return bal;
        };

        getTotalPoolBalance = async (instance) => {
            let bal = new BN(await instance.totalBalance());
            return bal;
        };
    });

    describe("Prime Perpetual", () => {
        describe("deposit", () => {
            before(async function() {
                [Primitive, perpetual] = await createProtocol();

                deposit = async (inTokenU) => {
                    inTokenU = new BN(inTokenU);
                    let balance0U = await getTokenBalance(
                        Primitive.tokenU,
                        Alice
                    );
                    let balance0P = await getTokenBalance(perpetual, Alice);
                    let balance0CU = await getTokenBalance(
                        Tokens.cusdc,
                        perpetual.address
                    );
                    let balance0TS = await getTotalSupply(perpetual);
                    let balance0TP = await getTotalPoolBalance(perpetual);

                    let liquidity = calculateAddLiquidity(
                        inTokenU,
                        balance0TS,
                        balance0TP
                    );

                    let depo = await perpetual.deposit(inTokenU, {
                        from: Alice,
                    });
                    truffleAssert.eventEmitted(depo, "Deposit", (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.outTokenPULP.toString()).to.be.eq(
                                liquidity.toString()
                            )
                        );
                    });

                    let balance1U = await getTokenBalance(
                        Primitive.tokenU,
                        Alice
                    );
                    let balance1P = await getTokenBalance(perpetual, Alice);
                    let balance1CU = await getTokenBalance(
                        Tokens.cusdc,
                        perpetual.address
                    );
                    let balance1TS = await getTotalSupply(perpetual);
                    let balance1TP = await getTotalPoolBalance(perpetual);

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
                    await verifyOptionInvariants(
                        Primitive.tokenU,
                        Primitive.tokenS,
                        Primitive.prime,
                        Primitive.redeem
                    );
                };
            });

            it("should revert if user does not have enough underlying", async () => {
                await truffleAssert.reverts(
                    perpetual.deposit(MILLION_ETHER),
                    ERR_BAL_UNDERLYING
                );
            });

            it("should revert if deposit is below min liquidity", async () => {
                await truffleAssert.reverts(
                    perpetual.deposit(1),
                    ERR_BAL_UNDERLYING
                );
            });

            it("should deposit successfully", async () => {
                await deposit(ONE_ETHER);
            });

            it("should deposit successfully and consecutively", async () => {
                await deposit(ONE_ETHER);
                await deposit(FIVE_ETHER);
                await deposit(TEN_ETHER);
                await deposit(HUNDRED_ETHER);
            });
        });

        describe("withdraw", () => {
            before(async function() {
                [Primitive, perpetual] = await createProtocol();
                await deposit(TEN_ETHER);
                callWithdraw = async (from, amount) => {
                    await withdraw(
                        from,
                        amount,
                        Primitive.tokenU,
                        Primitive.tokenS,
                        perpetual,
                        Primitive.prime,
                        Primitive.redeem
                    );
                    await verifyOptionInvariants(
                        Primitive.tokenU,
                        Primitive.tokenS,
                        Primitive.prime,
                        Primitive.redeem
                    );
                };
            });

            it("should revert if user does not have enough underlying", async () => {
                await truffleAssert.reverts(
                    perpetual.withdraw(MILLION_ETHER),
                    ERR_BAL_UNDERLYING
                );
            });

            it("should withdraw successfully", async () => {
                await callWithdraw(Alice, ONE_ETHER);
            });

            it("should withdraw successfully and consecutively", async () => {
                await callWithdraw(Alice, FIVE_ETHER);
                await deposit(HUNDRED_ETHER);
                await callWithdraw(Alice, TEN_ETHER);
            });
        });

        describe("mint", () => {
            before(async function() {
                [Primitive, perpetual] = await createProtocol();
                await deposit(TEN_ETHER);

                mint = async (inTokenS) => {
                    inTokenS = new BN(inTokenS);
                    let balance0U = await getTokenBalance(
                        Primitive.tokenU,
                        Alice
                    );
                    let balance0P = await getTokenBalance(perpetual, Alice);
                    let balance0Prime = await getTokenBalance(
                        Primitive.prime,
                        Alice
                    );
                    let balance0S = await getTokenBalance(
                        Primitive.tokenS,
                        Alice
                    );
                    let interestBalances = await perpetual.interestBalances();
                    let balance0CU = new BN(interestBalances.balanceU);
                    let balance0TS = await getTotalSupply(perpetual);
                    let balance0TP = await getTotalPoolBalance(perpetual);

                    let outTokenU = inTokenS
                        .mul(new BN(Parameters.base))
                        .div(new BN(Parameters.quote));
                    let payment = inTokenS.add(
                        inTokenS.div(await perpetual.fee())
                    );

                    let event = await perpetual.mint(inTokenS, {
                        from: Alice,
                    });

                    truffleAssert.eventEmitted(event, "Insure", (ev) => {
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

                    let balance1U = await getTokenBalance(
                        Primitive.tokenU,
                        Alice
                    );
                    let balance1P = await getTokenBalance(perpetual, Alice);
                    let balance1Prime = await getTokenBalance(
                        Primitive.prime,
                        Alice
                    );
                    let balance1S = await getTokenBalance(
                        Primitive.tokenS,
                        Alice
                    );

                    interestBalances = await perpetual.interestBalances();
                    let balance1CU = new BN(interestBalances.balanceU);
                    let balance1TS = await getTotalSupply(perpetual);
                    let balance1TP = await getTotalPoolBalance(perpetual);
                    let deltaU = balance1U.sub(balance0U);
                    let deltaP = balance1P.sub(balance0P);
                    let deltaS = balance1S.sub(balance0S);
                    let deltaPrime = balance1Prime.sub(balance0Prime);
                    let deltaCU = balance1CU.sub(balance0CU);
                    let deltaTS = balance1TS.sub(balance0TS);
                    let deltaTP = balance1TP.sub(balance0TP);

                    assertBNEqual(deltaU, ZERO);
                    assertBNEqual(deltaP, ZERO);
                    assertBNEqual(deltaPrime, outTokenU);
                    assertBNEqual(deltaS, payment.neg());
                    assertBNEqual(deltaCU, outTokenU.neg());
                    assertBNEqual(deltaTS, ZERO);
                    assertBNEqual(deltaTP, ZERO);
                    await verifyOptionInvariants(
                        Primitive.tokenU,
                        Primitive.tokenS,
                        Primitive.prime,
                        Primitive.redeem
                    );
                };
            });

            it("should revert if user does not have enough strike", async () => {
                await truffleAssert.reverts(
                    perpetual.mint(MILLION_ETHER),
                    ERR_BAL_STRIKE
                );
            });

            it("should mint successfully", async () => {
                await mint(ONE_ETHER);
            });

            it("should mint successfully and consecutively", async () => {
                await mint(ONE_ETHER);
                await mint(FIVE_ETHER);
                await deposit(HUNDRED_ETHER);
                await mint(TEN_ETHER);
                await mint(FIFTY_ETHER);
                await mint(FIVE_ETHER);
            });
        });

        describe("redeem", () => {
            before(async function() {
                [Primitive, perpetual] = await createProtocol();
                await deposit(HUNDRED_ETHER);
                await mint(FIFTY_ETHER);

                /**
                 * @notice Redeem tokenP for tokenS at a 1:1 ratio.
                 */
                redeem = async (inTokenP) => {
                    inTokenP = new BN(inTokenP);
                    let balance0U = await getTokenBalance(
                        Primitive.tokenU,
                        Alice
                    );
                    let balance0P = await getTokenBalance(perpetual, Alice);
                    let balance0Prime = await getTokenBalance(
                        Primitive.prime,
                        Alice
                    );
                    let balance0S = await getTokenBalance(
                        Primitive.tokenS,
                        Alice
                    );
                    let interestBalances = await perpetual.interestBalances();
                    let balance0CU = new BN(interestBalances.balanceU);
                    let balance0TS = await getTotalSupply(perpetual);
                    let balance0TP = await getTotalPoolBalance(perpetual);

                    let outTokenS = inTokenP
                        .mul(new BN(Parameters.quote))
                        .div(new BN(Parameters.base));

                    let event = await perpetual.redeem(inTokenP, {
                        from: Alice,
                    });

                    truffleAssert.eventEmitted(event, "Redemption", (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.inTokenP.toString()).to.be.eq(
                                inTokenP.toString()
                            ) &&
                            expect(ev.outTokenS.toString()).to.be.eq(
                                outTokenS.toString()
                            )
                        );
                    });

                    let balance1U = await getTokenBalance(
                        Primitive.tokenU,
                        Alice
                    );
                    let balance1P = await getTokenBalance(perpetual, Alice);
                    let balance1Prime = await getTokenBalance(
                        Primitive.prime,
                        Alice
                    );
                    let balance1S = await getTokenBalance(
                        Primitive.tokenS,
                        Alice
                    );

                    interestBalances = await perpetual.interestBalances();
                    let balance1CU = new BN(interestBalances.balanceU);
                    let balance1TS = await getTotalSupply(perpetual);
                    let balance1TP = await getTotalPoolBalance(perpetual);

                    let deltaU = balance1U.sub(balance0U);
                    let deltaP = balance1P.sub(balance0P);
                    let deltaS = balance1S.sub(balance0S);
                    let deltaPrime = balance1Prime.sub(balance0Prime);
                    let deltaCU = balance1CU.sub(balance0CU);
                    let deltaTS = balance1TS.sub(balance0TS);
                    let deltaTP = balance1TP.sub(balance0TP);

                    assertBNEqual(deltaU, ZERO);
                    assertBNEqual(deltaS, outTokenS);
                    assertBNEqual(deltaP, ZERO);
                    assertBNEqual(deltaPrime, inTokenP.neg());
                    assertBNEqual(deltaCU, ZERO);
                    assertBNEqual(deltaTS, ZERO);
                    assertWithinError(
                        deltaTP,
                        inTokenP.neg(),
                        constants.PARAMETERS.MAX_ERROR_PTS
                    );
                    await verifyOptionInvariants(
                        Primitive.tokenU,
                        Primitive.tokenS,
                        Primitive.prime,
                        Primitive.redeem
                    );
                };
            });

            it("should revert if user does not have enough prime", async () => {
                await truffleAssert.reverts(
                    perpetual.redeem(MILLION_ETHER),
                    ERR_BAL_PRIME
                );
            });

            it("should redeem successfully", async () => {
                await redeem(ONE_ETHER);
            });

            it("should redeem successfully and consecutively", async () => {
                await redeem(ONE_ETHER);
                await redeem(FIVE_ETHER);
                await deposit(HUNDRED_ETHER);
                await redeem(TEN_ETHER);
                await redeem(TEN_ETHER);
            });
        });

        describe("exercise", () => {
            before(async function() {
                [Primitive, perpetual] = await createProtocol();
                await deposit(HUNDRED_ETHER);
                await mint(FIFTY_ETHER);

                /**
                 * @notice Redeem tokenP for tokenS at a 1:1 ratio.
                 */
                exercise = async (inTokenP) => {
                    inTokenP = new BN(inTokenP);
                    let balance0U = await getTokenBalance(
                        Primitive.tokenU,
                        Alice
                    );
                    let balance0P = await getTokenBalance(perpetual, Alice);
                    let balance0Prime = await getTokenBalance(
                        Primitive.prime,
                        Alice
                    );
                    let balance0S = await getTokenBalance(
                        Primitive.tokenS,
                        Alice
                    );
                    let interestBalances = await perpetual.interestBalances();
                    let balance0CU = new BN(interestBalances.balanceU);
                    let balance0TS = await getTotalSupply(perpetual);
                    let balance0TP = await getTotalPoolBalance(perpetual);

                    let outTokenS = inTokenP
                        .mul(new BN(Parameters.quote))
                        .div(new BN(Parameters.base));

                    let event = await perpetual.exercise(inTokenP, {
                        from: Alice,
                    });

                    truffleAssert.eventEmitted(event, "Swap", (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.inTokenP.toString()).to.be.eq(
                                inTokenP.toString()
                            ) &&
                            expect(ev.outTokenS.toString()).to.be.eq(
                                outTokenS
                                    .add(outTokenS.div(new BN(1000)))
                                    .toString()
                            )
                        );
                    });

                    let balance1U = await getTokenBalance(
                        Primitive.tokenU,
                        Alice
                    );
                    let balance1P = await getTokenBalance(perpetual, Alice);
                    let balance1Prime = await getTokenBalance(
                        Primitive.prime,
                        Alice
                    );
                    let balance1S = await getTokenBalance(
                        Primitive.tokenS,
                        Alice
                    );

                    interestBalances = await perpetual.interestBalances();
                    let balance1CU = new BN(interestBalances.balanceU);
                    let balance1TS = await getTotalSupply(perpetual);
                    let balance1TP = await getTotalPoolBalance(perpetual);

                    let deltaU = balance1U.sub(balance0U);
                    let deltaP = balance1P.sub(balance0P);
                    let deltaS = balance1S.sub(balance0S);
                    let deltaPrime = balance1Prime.sub(balance0Prime);
                    let deltaCU = balance1CU.sub(balance0CU);
                    let deltaTS = balance1TS.sub(balance0TS);
                    let deltaTP = balance1TP.sub(balance0TP);

                    assertBNEqual(deltaU, inTokenP);
                    assertBNEqual(deltaS, ZERO);
                    assertBNEqual(deltaP, ZERO);
                    assertBNEqual(deltaPrime, outTokenS.neg());
                    assertBNEqual(deltaCU, ZERO);
                    assertBNEqual(deltaTS, ZERO);
                    assertWithinError(
                        deltaTP,
                        ZERO,
                        constants.PARAMETERS.MAX_ERROR_PTS
                    );
                    await verifyOptionInvariants(
                        Primitive.tokenU,
                        Primitive.tokenS,
                        Primitive.prime,
                        Primitive.redeem
                    );
                };
            });

            it("should revert if user does not have enough prime", async () => {
                await truffleAssert.reverts(
                    perpetual.exercise(MILLION_ETHER),
                    ERR_BAL_PRIME
                );
            });

            it("should exercise successfully", async () => {
                await exercise(ONE_ETHER);
            });

            it("should exercise successfully and consecutively", async () => {
                await exercise(ONE_ETHER);
                await exercise(FIVE_ETHER);
                await deposit(HUNDRED_ETHER);
                await exercise(TEN_ETHER);
            });
        });

        describe("full test", () => {
            before(async function() {
                [Primitive, perpetual] = await createProtocol();
                await deposit(HUNDRED_ETHER);
                await mint(FIFTY_ETHER);
            });

            it("should run multiple transactions consecutively", async () => {
                const run = async (runs) => {
                    for (let i = 0; i < runs; i++) {
                        let amt = Math.floor(
                            ONE_ETHER * Math.random()
                        ).toString();
                        await deposit(amt);
                        await mint(amt);
                        await mint(amt);
                        await callWithdraw(Alice, amt);
                        await deposit(amt);
                        await redeem(amt);
                        await exercise(amt);
                    }
                    await Primitive.prime.take();
                    await verifyOptionInvariants(
                        Primitive.tokenU,
                        Primitive.tokenS,
                        Primitive.prime,
                        Primitive.redeem
                    );
                };

                await run(5);
            });
        });
    });
});
