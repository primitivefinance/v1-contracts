const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const utils = require("./utils");
const constants = require("./constants");
const {
    newERC20,
    newInterestBearing,
    newOption,
    newRedeem,
    newPerpetual,
    newOptionFactory,
} = utils;
const {
    ERR_ZERO,
    ERR_BAL_STRIKE,
    ERR_BAL_UNDERLYING,
    ERR_NOT_OWNER,
    ERR_PAUSED,
    ERR_EXPIRED,
    ERR_NOT_VALID,
    ONE_ETHER,
    FIVE_ETHER,
    HUNDRED_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
    ZERO_ADDRESS,
    FEE,
} = constants;

contract("Perpetual", (accounts) => {
    // WEB3
    const { toWei } = web3.utils;

    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let factory;

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

    before(async () => {
        // setup a factory to create the option from
        factory = await newOptionFactory();

        createProtocol = async () => {
            // initialize underlying tokens
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

            let _underlyingU = usdc;
            let _underlyingS = dai;
            let _tokenU = cusdc;
            let _tokenS = cdai;
            let tokenU = cusdc.address;
            let tokenS = cdai.address;
            let base = toWei("0.9");
            let price = toWei("1");
            let expiry = "7590868800";

            let prime = await newOption(
                factory,
                tokenU,
                tokenS,
                base,
                price,
                expiry
            );
            let tokenP = prime.address;
            let redeem = await newRedeem(tokenP);
            let tokenR = redeem.address;

            // deploy the perpetual
            let perpetual = await newPerpetual(
                cdai.address,
                cusdc.address,
                tokenP,
                Alice
            );

            let fee = toWei("0.001");

            const Primitive = {
                usdc: usdc,
                dai: dai,
                cusdc: cusdc,
                cdai: cdai,
                _underlyingU: _underlyingU,
                _underlyingS: _underlyingS,
                _tokenU: _tokenU,
                _tokenS: _tokenS,
                prime: prime,
                tokenP: tokenP,
                tokenR: tokenR,
                redeem: redeem,
                perpetual: perpetual,
                fee: fee,
            };

            await dai.approve(perpetual.address, MILLION_ETHER, {
                from: Alice,
            });
            await usdc.approve(perpetual.address, MILLION_ETHER, {
                from: Alice,
            });

            await prime.approve(perpetual.address, MILLION_ETHER, {
                from: Alice,
            });

            await prime.approve(prime.address, MILLION_ETHER, {
                from: Alice,
            });
            return Primitive;
        };

        getBalance = async (token, address) => {
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
        before(async function() {
            Primitive = await createProtocol();
        });
        it("should return the correct cdai address", async () => {
            assert.equal(
                (await Primitive.perpetual.cdai()).toString(),
                Primitive.cdai.address,
                "Incorrect cdai"
            );
        });

        it("should return the correct cusdc address", async () => {
            assert.equal(
                (await Primitive.perpetual.cusdc()).toString(),
                Primitive.cusdc.address,
                "Incorrect cusdc"
            );
        });

        it("should return the correct fee address", async () => {
            assert.equal(
                (await Primitive.perpetual.fee()).toString(),
                Primitive.fee,
                "Incorrect fee"
            );
        });

        describe("deposit", () => {
            before(async function() {
                Primitive = await createProtocol();

                deposit = async (inTokenU) => {
                    inTokenU = new BN(inTokenU);
                    let balance0U = await getBalance(
                        Primitive._underlyingU,
                        Alice
                    );
                    let balance0P = await getBalance(
                        Primitive.perpetual,
                        Alice
                    );
                    let balance0CU = await getBalance(
                        Primitive._tokenU,
                        Primitive.perpetual.address
                    );
                    let balance0TS = await getTotalSupply(Primitive.perpetual);
                    let balance0TP = await getTotalPoolBalance(
                        Primitive.perpetual
                    );

                    let liquidity = calculateAddLiquidity(
                        inTokenU,
                        balance0TS,
                        balance0TP
                    );

                    if (balance0U.lt(inTokenU)) {
                        return;
                    }
                    let depo = await Primitive.perpetual.deposit(inTokenU, {
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

                    let balance1U = await getBalance(
                        Primitive._underlyingU,
                        Alice
                    );
                    let balance1P = await getBalance(
                        Primitive.perpetual,
                        Alice
                    );
                    let balance1CU = await getBalance(
                        Primitive._tokenU,
                        Primitive.perpetual.address
                    );
                    let balance1TS = await getTotalSupply(Primitive.perpetual);
                    let balance1TP = await getTotalPoolBalance(
                        Primitive.perpetual
                    );

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

            it("should revert if user does not have enough underlying", async () => {
                await truffleAssert.reverts(
                    Primitive.perpetual.deposit(MILLION_ETHER),
                    ERR_BAL_UNDERLYING
                );
            });

            it("should revert if deposit is below min liquidity", async () => {
                await truffleAssert.reverts(
                    Primitive.perpetual.deposit(1),
                    ERR_BAL_UNDERLYING
                );
            });

            it("should deposit successfully", async () => {
                await deposit(ONE_ETHER);
            });
        });
    });
});
