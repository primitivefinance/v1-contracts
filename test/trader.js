const {
    assert,
    expect
} = require("chai");
const chai = require('chai');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const PrimeTrader = artifacts.require("PrimeTrader");
const PrimeOption = artifacts.require("PrimeOption");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const Weth = artifacts.require("WETH9");
const Dai = artifacts.require("DAI");
const common_constants = require("./constants");
const {
    ERR_ZERO,
    ERR_BAL_PRIME,
    ERR_BAL_STRIKE,
    ERR_BAL_UNDERLYING,
    ONE_ETHER,
    FIVE_ETHER,
    TEN_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
} = common_constants;

contract("Trader", accounts => {
    // WEB3
    const {
        toWei
    } = web3.utils;
    const {
        fromWei
    } = web3.utils;

    // ACCOUNTS
    const Alice = accounts[0]
    const Bob = accounts[1]
    const Mary = accounts[2]
    const Kiln = accounts[3]
    const Don = accounts[4]
    const Penny = accounts[5]
    const Cat = accounts[6]
    const Bjork = accounts[7]
    const Olga = accounts[8]
    const Treasury = accounts[9]


    let trader, weth, dai, prime, redeem;
    let tokenU, tokenS, _tokenU, _tokenS, tokenP;
    let base, price, expiry;

    const assertBNEqual = (actualBN, expectedBN, message) => {
        assert.equal(actualBN.toString(), expectedBN.toString(), message);
    }

    before(async () => {
        weth = await Weth.new();
        dai = await Dai.new(THOUSAND_ETHER);
        trader = await PrimeTrader.new(weth.address);

        _tokenU = dai;
        _tokenS = weth;
        tokenU = dai.address;
        tokenS = weth.address;
        marketId = 1;
        optionName = "ETH Put 200 DAI Expiring May 30 2020";
        optionSymbol = "PRIME";
        redeemName = "ETH Put Redeemable Token";
        redeemSymbol = "REDEEM";
        base = toWei('200');
        price = toWei('1');
        expiry = '1590868800'; // May 30, 2020, 8PM UTC
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
            tokenP,
            tokenS
        );

        await prime.initTokenR(redeem.address);

        getBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        }
    });

    describe("Constructor", () => {
        it("should return the correct weth address", async () => {
            expect(await trader.weth()).to.be.equal(weth.address);
        });
    });

    describe("safeMint", () => {
        beforeEach(async () => {
            trader = await PrimeTrader.new(weth.address);
            await _tokenU.approve(trader.address, MILLION_ETHER, {
                from: Alice
            });
            await _tokenS.approve(trader.address, MILLION_ETHER, {
                from: Alice
            });

            safeMint = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let outTokenR = inTokenU.mul(new BN(price)).div(new BN(base));

                let balanceU = await getBalance(_tokenU, Alice);
                let balanceP = await getBalance(prime, Alice);
                let balanceR = await getBalance(redeem, Alice);

                let mint = await trader.safeMint(tokenP, inTokenU, Alice);

                let deltaU = (await getBalance(_tokenU, Alice)).sub(balanceU);
                let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                let deltaR = (await getBalance(redeem, Alice)).sub(balanceR);

                assertBNEqual(deltaU, inTokenU.neg());
                assertBNEqual(deltaP, inTokenU);
                assertBNEqual(deltaR, outTokenR);

                await truffleAssert.eventEmitted(mint, "Mint", (ev) => {
                    return expect(ev.from).to.be.eq(Alice) &&
                        expect((ev.outTokenP).toString()).to.be.eq(inTokenU.toString()) &&
                        expect((ev.outTokenR).toString()).to.be.eq(outTokenR.toString())
                });
            }
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeMint(
                    tokenP,
                    0,
                    Alice
                ),
                ERR_ZERO
            );
        });

        it("should revert if tokenP is not a Prime", async () => {
            await truffleAssert.reverts(
                trader.safeMint(
                    Alice,
                    10,
                    Alice
                )
            );
        });

        it("should revert if msg.sender does not have enough tokenU for tx", async () => {
            await truffleAssert.reverts(
                trader.safeMint(
                    tokenP,
                    MILLION_ETHER,
                    Alice
                ),
                ERR_BAL_UNDERLYING
            );
        });

        it("should emit the Mint event", async () => {
            let inTokenU = new BN(ONE_ETHER);
            let outTokenR = inTokenU.mul(new BN(price)).div(new BN(base));
            let mint = await trader.safeMint(tokenP, inTokenU, Alice);
            await truffleAssert.eventEmitted(mint, "Mint", (ev) => {
                return expect(ev.from).to.be.eq(Alice) &&
                    expect((ev.outTokenP).toString()).to.be.eq(inTokenU.toString()) &&
                    expect((ev.outTokenR).toString()).to.be.eq(outTokenR.toString())
            });
        });

        it("should mint primes and redeems in correct amounts", async () => {
            await safeMint(ONE_ETHER);
        });

        it("should successfully call safe mint a few times in a row", async () => {
            await safeMint(ONE_ETHER);
            await safeMint(TEN_ETHER);
            await safeMint(FIVE_ETHER);
            await safeMint(toWei('0.5123542351'));
            await safeMint(toWei('1.23526231124324'));
            await safeMint(toWei('2.234345'));
        });
    });

    describe("safeSwap", () => {
        beforeEach(async () => {
            trader = await PrimeTrader.new(weth.address);
            await _tokenU.approve(trader.address, MILLION_ETHER, {
                from: Alice
            });
            await _tokenS.approve(trader.address, MILLION_ETHER, {
                from: Alice
            });
            await prime.approve(trader.address, MILLION_ETHER, {
                from: Alice
            });
            await safeMint(TEN_ETHER);

            safeSwap = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let inTokenP = inTokenU;
                let inTokenS = inTokenU.mul(new BN(price)).div(new BN(base));

                let balanceU = await getBalance(_tokenU, Alice);
                let balanceP = await getBalance(prime, Alice);
                let balanceS = await getBalance(_tokenS, Alice);

                let swap = await trader.safeSwap(tokenP, inTokenU, Alice);

                let deltaU = (await getBalance(_tokenU, Alice)).sub(balanceU);
                let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                let deltaS = (await getBalance(_tokenS, Alice)).sub(balanceS);

                assertBNEqual(deltaU, inTokenU);
                assertBNEqual(deltaP, inTokenP.neg());
                assertBNEqual(deltaS, inTokenS.neg());

                await truffleAssert.eventEmitted(swap, "Swap", (ev) => {
                    return expect(ev.from).to.be.eq(Alice) &&
                        expect((ev.outTokenU).toString()).to.be.eq(inTokenU.toString()) &&
                        expect((ev.inTokenS).toString()).to.be.eq(inTokenS.toString())
                });
            }
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeSwap(
                    tokenP,
                    0,
                    Alice
                ),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough prime tokens", async () => {
            await truffleAssert.reverts(
                trader.safeSwap(
                    tokenP,
                    MILLION_ETHER,
                    Alice
                ),
                ERR_BAL_PRIME
            );
        });

        it("should revert if user does not have enough prime tokens", async () => {
            await truffleAssert.reverts(
                trader.safeSwap(
                    tokenP,
                    MILLION_ETHER,
                    Alice
                ),
                ERR_BAL_PRIME
            );
        });

        it("should revert if user does not have enough strike tokens", async () => {
            await trader.safeMint(tokenP, ONE_ETHER, Bob);
            await _tokenS.transfer(Alice, await _tokenS.balanceOf(Bob), {
                from: Bob
            })
            await truffleAssert.reverts(
                trader.safeSwap(
                    tokenP,
                    ONE_ETHER,
                    Bob, {
                        from: Bob
                    }
                ),
                ERR_BAL_STRIKE
            );
        });

        it("should swap consecutively", async () => {
            await _tokenS.deposit({
                from: Alice,
                value: TEN_ETHER
            });
            await safeSwap(toWei('0.1'));
            await safeSwap(toWei('0.32525'));
            await safeSwap(ONE_ETHER);
        });
    });

    describe("safeRedeem", () => {
        beforeEach(async () => {
            trader = await PrimeTrader.new(weth.address);
            await _tokenU.approve(trader.address, MILLION_ETHER, {from: Alice});
            await _tokenS.approve(trader.address, MILLION_ETHER, {from: Alice});
            await prime.approve(trader.address, MILLION_ETHER, {from: Alice});
            await redeem.approve(trader.address, MILLION_ETHER, {from: Alice});
            await safeMint(toWei('200'));
            

            safeRedeem = async (inTokenR) => {
                inTokenR = new BN(inTokenR);
                let outTokenS = inTokenR;

                let balanceR = await getBalance(redeem, Alice);
                let balanceS = await getBalance(_tokenS, Alice);

                let event = await trader.safeRedeem(tokenP, inTokenR, Alice);
                
                let deltaR = (await getBalance(redeem, Alice)).sub(balanceR);
                let deltaS = (await getBalance(_tokenS, Alice)).sub(balanceS);

                assertBNEqual(deltaR, inTokenR.neg());
                assertBNEqual(deltaS, outTokenS);

                await truffleAssert.eventEmitted(event, "Redeem", (ev) => {
                    return  expect(ev.from).to.be.eq(Alice) &&
                            expect((ev.inTokenR).toString()).to.be.eq(inTokenR.toString()) &&
                            expect((ev.inTokenR).toString()).to.be.eq(outTokenS.toString())
                });
            }
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeRedeem(
                    tokenP,
                    0,
                    Alice
                ),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough redeem tokens", async () => {
            await truffleAssert.reverts(
                trader.safeRedeem(
                    tokenP,
                    MILLION_ETHER,
                    Alice
                ),
                ERR_BAL_REDEEM
            );
        });

        it("should revert if Prime contract does not have enough strike tokens", async () => {
            await truffleAssert.reverts(
                trader.safeRedeem(
                    tokenP,
                    ONE_ETHER,
                    Alice
                ),
                ERR_BAL_STRIKE
            );
        });

        it("should redeem consecutively", async () => {
            await safeSwap(toWei('200'));
            await safeRedeem(toWei('0.1'));
            await safeRedeem(toWei('0.32525'));
            await safeRedeem(toWei('0.5'));
        });
    });

    describe("safeClose", () => {
        beforeEach(async () => {
            trader = await PrimeTrader.new(weth.address);
            await _tokenU.approve(trader.address, MILLION_ETHER, {from: Alice});
            await _tokenS.approve(trader.address, MILLION_ETHER, {from: Alice});
            await prime.approve(trader.address, MILLION_ETHER, {from: Alice});
            await redeem.approve(trader.address, MILLION_ETHER, {from: Alice});
            await safeMint(toWei('1'));
            

            safeClose = async (inTokenP) => {
                inTokenP = new BN(inTokenP);
                let inTokenR = inTokenP.mul(new BN(price)).div(new BN(base));
                let outTokenU = inTokenP;

                let balanceU = await getBalance(_tokenU, Alice);
                let balanceP = await getBalance(prime, Alice);
                let balanceR = await getBalance(redeem, Alice);

                let event = await trader.safeClose(tokenP, inTokenP, Alice);
                
                let deltaU = (await getBalance(_tokenU, Alice)).sub(balanceU);
                let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                let deltaR = (await getBalance(redeem, Alice)).sub(balanceR);

                assertBNEqual(deltaU, outTokenU);
                assertBNEqual(deltaP, inTokenP.neg());
                assertBNEqual(deltaR, inTokenR.neg());

                await truffleAssert.eventEmitted(event, "Close", (ev) => {
                    return  expect(ev.from).to.be.eq(Alice) &&
                            expect((ev.inTokenP).toString()).to.be.eq(inTokenP.toString()) &&
                            expect((ev.inTokenP).toString()).to.be.eq(outTokenU.toString())
                });
            }
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeClose(
                    tokenP,
                    0,
                    Alice
                ),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough redeem tokens", async () => {
            await truffleAssert.reverts(
                trader.safeClose(
                    tokenP,
                    MILLION_ETHER,
                    Alice
                ),
                ERR_BAL_REDEEM
            );
        });

        it("should revert if user does not have enough prime tokens", async () => {
            await trader.safeMint(tokenP, ONE_ETHER, Bob);
            await prime.transfer(Alice, await prime.balanceOf(Bob), {from: Bob})
            await truffleAssert.reverts(
                trader.safeClose(
                    tokenP,
                    ONE_ETHER,
                    Bob,
                    {from: Bob}
                ),
                ERR_BAL_PRIME
            );
        });

        it("should close consecutively", async () => {
            await safeMint(TEN_ETHER);
            await safeClose(ONE_ETHER);
            await safeClose(FIVE_ETHER);
            await safeClose(toWei('2.5433451'));
        });
    });

    describe("full test", () => {
        beforeEach(async () => {
            trader = await PrimeTrader.new(weth.address);
            await _tokenU.approve(trader.address, MILLION_ETHER, {from: Alice});
            await _tokenS.approve(trader.address, MILLION_ETHER, {from: Alice});
            await prime.approve(trader.address, MILLION_ETHER, {from: Alice});
            await redeem.approve(trader.address, MILLION_ETHER, {from: Alice});
        });

        it("should handle multiple transactions", async () => {
            // Start with 100 Primes
            await _tokenU.mint(Alice, THOUSAND_ETHER);
            await safeMint(THOUSAND_ETHER);

            await safeClose(ONE_ETHER);
            await safeSwap(toWei('200'));
            await safeRedeem(toWei('0.1'));
            await safeClose(ONE_ETHER);
            await safeSwap(ONE_ETHER);
            await safeSwap(ONE_ETHER);
            await safeSwap(ONE_ETHER);
            await safeSwap(ONE_ETHER);
            await safeRedeem(toWei('0.23'));
            await safeRedeem(toWei('0.1234'));
            await safeRedeem(toWei('0.15'));
            await safeRedeem(toWei('0.2543'));
            await safeClose(FIVE_ETHER);
            await safeClose(await prime.balanceOf(Alice));
            await safeRedeem(await redeem.balanceOf(Alice));

            let balanceP = new BN(await prime.balanceOf(Alice));
            let balanceR = new BN(await redeem.balanceOf(Alice));

            assertBNEqual(balanceP, 0);
            assertBNEqual(balanceR, 0);
        });
    });
});