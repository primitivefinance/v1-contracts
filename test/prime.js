const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const PrimeOption = artifacts.require("PrimeOption");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const PrimeOptionTest = artifacts.require("PrimeOptionTest");
const Weth = artifacts.require("WETH9");
const Dai = artifacts.require("DAI");
const BadToken = artifacts.require("BadERC20");
const constants = require("./constants");
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
    ZERO_ADDRESS,
} = constants;

contract("Prime", (accounts) => {
    // WEB3
    const { toWei } = web3.utils;

    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let weth, dai, prime, redeem;
    let tokenU, tokenS, _tokenU, _tokenS, tokenP, tokenR;
    let base, price, expiry;

    const assertBNEqual = (actualBN, expectedBN, message) => {
        assert.equal(actualBN.toString(), expectedBN.toString(), message);
    };

    before(async () => {
        weth = await Weth.new();
        dai = await Dai.new(THOUSAND_ETHER);

        _tokenU = dai;
        _tokenS = weth;
        tokenU = dai.address;
        tokenS = weth.address;
        marketId = 1;
        optionName = "ETH Put 200 DAI Expiring May 30 2020";
        optionSymbol = "PRIME";
        redeemName = "ETH Put Redeemable Token";
        redeemSymbol = "REDEEM";
        base = toWei("200");
        price = toWei("1");
        expiry = "1590868800"; // May 30, 2020, 8PM UTC

        createPrime = async () => {
            let prime = await PrimeOption.new(
                optionName,
                optionSymbol,
                marketId,
                tokenU,
                tokenS,
                base,
                price,
                expiry
            );
            return prime;
        };

        createRedeem = async () => {
            let redeem = await PrimeRedeem.new(
                redeemName,
                redeemSymbol,
                tokenP,
                tokenS
            );
            return redeem;
        };
        prime = await createPrime();
        tokenP = prime.address;
        redeem = await createRedeem();
        tokenR = redeem.address;
        await prime.initTokenR(tokenR);

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
                case "r":
                    cache = new BN(await prime.cacheR());
                    break;
            }
            return cache;
        };
    });

    describe("Prime Redeem", () => {
        it("should return the correct controller", async () => {
            assert.equal(
                (await redeem.controller()).toString(),
                Alice,
                "Incorrect controller"
            );
        });
        it("should return the correct name", async () => {
            assert.equal(
                (await redeem.name()).toString(),
                redeemName,
                "Incorrect name"
            );
        });
        it("should return the correct symbol", async () => {
            assert.equal(
                (await redeem.symbol()).toString(),
                redeemSymbol,
                "Incorrect symbol"
            );
        });
        it("should return the correct tokenP", async () => {
            assert.equal(
                (await redeem.tokenP()).toString(),
                tokenP,
                "Incorrect tokenP"
            );
        });
        it("should return the correct tokenS", async () => {
            assert.equal(
                (await redeem.tokenS()).toString(),
                tokenS,
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
    describe("Prime Option", () => {
        it("should revert if tokenU or tokenS is address zero", async () => {
            await truffleAssert.reverts(
                PrimeOption.new(
                    optionName,
                    optionSymbol,
                    marketId,
                    ZERO_ADDRESS,
                    ZERO_ADDRESS,
                    base,
                    price,
                    expiry
                ),
                "ERR_ADDRESS_ZERO"
            );
        });

        it("should return the correct name", async () => {
            assert.equal(
                (await prime.name()).toString(),
                optionName,
                "Incorrect name"
            );
        });

        it("should return the correct symbol", async () => {
            assert.equal(
                (await prime.symbol()).toString(),
                optionSymbol,
                "Incorrect symbol"
            );
        });

        it("should return the correct marketID", async () => {
            assert.equal(
                (await prime.marketId()).toString(),
                marketId,
                "Incorrect id"
            );
        });

        it("should return the correct tokenU", async () => {
            assert.equal(
                (await prime.tokenU()).toString(),
                tokenU,
                "Incorrect tokenU"
            );
        });

        it("should return the correct tokenS", async () => {
            assert.equal(
                (await prime.tokenS()).toString(),
                tokenS,
                "Incorrect tokenS"
            );
        });

        it("should return the correct tokenR", async () => {
            assert.equal(
                (await prime.tokenR()).toString(),
                tokenR,
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

        it("should return the correct price", async () => {
            assert.equal(
                (await prime.price()).toString(),
                price,
                "Incorrect price"
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
            let result = await prime.prime();
            assert.equal(result._tokenU.toString(), tokenU, "Incorrect expiry");
            assert.equal(result._tokenS.toString(), tokenS, "Incorrect expiry");
            assert.equal(result._tokenR.toString(), tokenR, "Incorrect expiry");
            assert.equal(result._base.toString(), base, "Incorrect expiry");
            assert.equal(result._price.toString(), price, "Incorrect expiry");
            assert.equal(result._expiry.toString(), expiry, "Incorrect expiry");
        });

        it("should get the tokens", async () => {
            let result = await prime.getTokens();
            assert.equal(result._tokenU.toString(), tokenU, "Incorrect tokenU");
            assert.equal(result._tokenS.toString(), tokenS, "Incorrect tokenS");
            assert.equal(result._tokenR.toString(), tokenR, "Incorrect tokenR");
        });

        it("should get the caches", async () => {
            let result = await prime.getCaches();
            assert.equal(result._cacheU.toString(), "0", "Incorrect cacheU");
            assert.equal(result._cacheS.toString(), "0", "Incorrect cacheS");
            assert.equal(result._cacheR.toString(), "0", "Incorrect cacheR");
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

        it("should return the correct initial cacheR", async () => {
            assert.equal(
                (await prime.cacheR()).toString(),
                0,
                "Incorrect cacheR"
            );
        });

        it("should return the correct initial factory", async () => {
            assert.equal(
                (await prime.factory()).toString(),
                Alice,
                "Incorrect factory"
            );
        });

        it("should return the correct name for redeem", async () => {
            assert.equal(
                (await redeem.name()).toString(),
                redeemName,
                "Incorrect name"
            );
        });

        it("should return the correct symbol for redeem", async () => {
            assert.equal(
                (await redeem.symbol()).toString(),
                redeemSymbol,
                "Incorrect symbol"
            );
        });

        it("should return the correct tokenP for redeem", async () => {
            assert.equal(
                (await redeem.tokenP()).toString(),
                tokenP,
                "Incorrect tokenP"
            );
        });

        it("should return the correct tokenS for redeem", async () => {
            assert.equal(
                (await redeem.tokenS()).toString(),
                tokenS,
                "Incorrect tokenS"
            );
        });

        it("should return the correct controller for redeem", async () => {
            assert.equal(
                (await redeem.controller()).toString(),
                Alice,
                "Incorrect controller"
            );
        });

        it("should return the max draw", async () => {
            assert.equal(
                (await prime.maxDraw()).toString(),
                "0",
                "Incorrect Max Draw - Should be 0"
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
                await prime.kill();
                assert.equal(await prime.paused(), true);
            });

            it("should revert mint function call while paused contract", async () => {
                await truffleAssert.reverts(prime.mint(Alice), ERR_PAUSED);
            });

            it("should revert swap function call while paused contract", async () => {
                await truffleAssert.reverts(prime.swap(Alice), ERR_PAUSED);
            });

            it("should unpause contract", async () => {
                await prime.kill();
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
                prime = await createPrime();
                tokenP = prime.address;
                redeem = await createRedeem();
                tokenR = redeem.address;
                await prime.initTokenR(tokenR);

                mint = async (inTokenU) => {
                    inTokenU = new BN(inTokenU);
                    let outTokenR = inTokenU
                        .mul(new BN(price))
                        .div(new BN(base));

                    let balanceU = await getBalance(_tokenU, Alice);
                    let balanceP = await getBalance(prime, Alice);
                    let balanceR = await getBalance(redeem, Alice);

                    await _tokenU.transfer(tokenP, inTokenU, { from: Alice });
                    let event = await prime.mint(Alice);

                    let deltaU = (await getBalance(_tokenU, Alice)).sub(
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
                    let cacheR = await getCache("r");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.cacheU.toString()).to.be.eq(
                                cacheU.toString()
                            ) &&
                            expect(ev.cacheS.toString()).to.be.eq(
                                cacheS.toString()
                            ) &&
                            expect(ev.cacheR.toString()).to.be.eq(
                                cacheR.toString()
                            )
                        );
                    });
                };
            });

            it("revert if no tokens were sent to contract", async () => {
                await truffleAssert.reverts(prime.mint(Alice), ERR_ZERO);
            });

            it("mint tokenP and tokenR to Alice", async () => {
                let inTokenU = ONE_ETHER;
                await mint(inTokenU);
            });

            it("send 1 wei of tokenU to tokenP and call mint", async () => {
                let inTokenU = "1";
                await mint(inTokenU);
            });
        });

        describe("swap", () => {
            beforeEach(async () => {
                prime = await createPrime();
                tokenP = prime.address;
                redeem = await createRedeem();
                tokenR = redeem.address;
                await prime.initTokenR(tokenR);

                swap = async (inTokenP) => {
                    inTokenP = new BN(inTokenP);
                    let inTokenS = inTokenP
                        .mul(new BN(price))
                        .div(new BN(base));
                    let outTokenU = inTokenP;

                    let balanceU = await getBalance(_tokenU, Alice);
                    let balanceP = await getBalance(prime, Alice);
                    let balanceS = await getBalance(_tokenS, Alice);

                    await prime.transfer(tokenP, inTokenP, { from: Alice });
                    await _tokenS.transfer(tokenP, inTokenS, { from: Alice });
                    let event = await prime.swap(Alice);

                    let deltaU = (await getBalance(_tokenU, Alice)).sub(
                        balanceU
                    );
                    let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                    let deltaS = (await getBalance(_tokenS, Alice)).sub(
                        balanceS
                    );

                    assertBNEqual(deltaU, outTokenU);
                    assertBNEqual(deltaP, inTokenP.neg());
                    assertBNEqual(deltaS, inTokenS.neg());

                    await truffleAssert.eventEmitted(event, "Swap", (ev) => {
                        return (
                            expect(ev.from).to.be.eq(Alice) &&
                            expect(ev.outTokenU.toString()).to.be.eq(
                                outTokenU.toString()
                            ) &&
                            expect(ev.inTokenS.toString()).to.be.eq(
                                inTokenS.toString()
                            )
                        );
                    });

                    let cacheU = await getCache("u");
                    let cacheS = await getCache("s");
                    let cacheR = await getCache("r");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.cacheU.toString()).to.be.eq(
                                cacheU.toString()
                            ) &&
                            expect(ev.cacheS.toString()).to.be.eq(
                                cacheS.toString()
                            ) &&
                            expect(ev.cacheR.toString()).to.be.eq(
                                cacheR.toString()
                            )
                        );
                    });
                };
            });

            it("revert if 0 tokenS and 0 tokenP were sent to contract", async () => {
                await truffleAssert.reverts(prime.swap(Alice), ERR_ZERO);
            });

            it("reverts if outTokenU > inTokenP, not enough tokenP was sent in", async () => {
                await mint(toWei("0.01"));
                await prime.transfer(tokenP, toWei("0.01"));
                await _tokenS.deposit({ from: Alice, value: price });
                await _tokenS.transfer(tokenP, price);
                await truffleAssert.reverts(
                    prime.swap(Alice, { from: Alice }),
                    ERR_BAL_UNDERLYING
                );
                await prime.take();
            });

            it("swaps consecutively", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                await _tokenS.deposit({ from: Alice, value: price });
                await swap(toWei("0.1"));
                await swap(toWei("0.34521"));

                // Interesting, the two 0s at the end of this are necessary. If they are not 0s, the
                // returned value will be unequal because the accuracy of the mint is only 10^16.
                // This should be verified further.
                await swap("2323234235200");
            });
        });

        describe("redeem", () => {
            beforeEach(async () => {
                prime = await createPrime();
                tokenP = prime.address;
                redeem = await createRedeem();
                tokenR = redeem.address;
                await prime.initTokenR(tokenR);

                callRedeem = async (inTokenR) => {
                    inTokenR = new BN(inTokenR);
                    let outTokenS = inTokenR;

                    let balanceS = await getBalance(_tokenS, Alice);
                    let balanceR = await getBalance(redeem, Alice);

                    await redeem.transfer(tokenP, inTokenR, { from: Alice });
                    let event = await prime.redeem(Alice);

                    let deltaS = (await getBalance(_tokenS, Alice)).sub(
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
                    let cacheR = await getCache("r");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.cacheU.toString()).to.be.eq(
                                cacheU.toString()
                            ) &&
                            expect(ev.cacheS.toString()).to.be.eq(
                                cacheS.toString()
                            ) &&
                            expect(ev.cacheR.toString()).to.be.eq(
                                cacheR.toString()
                            )
                        );
                    });
                };
            });

            it("revert if 0 tokenR were sent to contract", async () => {
                await truffleAssert.reverts(prime.redeem(Alice), ERR_ZERO);
            });

            it("reverts if not enough tokenS in prime contract", async () => {
                await mint(toWei("200"));
                await redeem.transfer(tokenP, toWei("1"));
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
                    .div(new BN(price));
                await mint(inTokenU);
                await swap(inTokenU);
                await callRedeem(toWei("0.1"));
                await callRedeem(toWei("0.34521"));
                await callRedeem("23232342352345");
            });
        });

        describe("close", () => {
            beforeEach(async () => {
                prime = await createPrime();
                tokenP = prime.address;
                redeem = await createRedeem();
                tokenR = redeem.address;
                await prime.initTokenR(tokenR);

                close = async (inTokenP) => {
                    inTokenP = new BN(inTokenP);
                    let inTokenR = inTokenP
                        .mul(new BN(price))
                        .div(new BN(base));
                    let outTokenU = inTokenP;

                    let balanceR = await getBalance(redeem, Alice);
                    let balanceU = await getBalance(_tokenU, Alice);
                    let balanceP = await getBalance(prime, Alice);

                    await prime.transfer(tokenP, inTokenP, { from: Alice });
                    await redeem.transfer(tokenP, inTokenR, { from: Alice });
                    let event = await prime.close(Alice);

                    let deltaU = (await getBalance(_tokenU, Alice)).sub(
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
                    let cacheR = await getCache("r");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return (
                            expect(ev.cacheU.toString()).to.be.eq(
                                cacheU.toString()
                            ) &&
                            expect(ev.cacheS.toString()).to.be.eq(
                                cacheS.toString()
                            ) &&
                            expect(ev.cacheR.toString()).to.be.eq(
                                cacheR.toString()
                            )
                        );
                    });
                };
            });

            it("revert if 0 tokenR were sent to contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                await prime.transfer(tokenP, inTokenP, { from: Alice });
                await truffleAssert.reverts(prime.close(Alice), ERR_ZERO);
            });

            it("revert if 0 tokenP were sent to contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                let inTokenR = new BN(inTokenP)
                    .mul(new BN(price))
                    .div(new BN(base));
                await redeem.transfer(tokenP, inTokenR, { from: Alice });
                await truffleAssert.reverts(prime.close(Alice), ERR_ZERO);
            });

            it("revert if no tokens were sent to contract", async () => {
                await truffleAssert.reverts(prime.close(Alice), ERR_ZERO);
            });

            it("revert if not enough tokenP was sent into contract", async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                let inTokenR = new BN(inTokenP)
                    .mul(new BN(price))
                    .div(new BN(base));
                await redeem.transfer(tokenP, inTokenR, { from: Alice });
                await prime.transfer(tokenP, toWei("0.5"), { from: Alice });
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
                prime = await createPrime();
                tokenP = prime.address;
                redeem = await createRedeem();
                tokenR = redeem.address;
                await prime.initTokenR(tokenR);
            });

            it("handles multiple transactions", async () => {
                // Start with 1000 Primes
                await _tokenU.mint(Alice, THOUSAND_ETHER);
                let inTokenU = THOUSAND_ETHER;
                await mint(inTokenU);
                await close(ONE_ETHER);
                await swap(toWei("200"));
                await callRedeem(toWei("0.1"));
                await close(ONE_ETHER);
                await swap(ONE_ETHER);
                await swap(ONE_ETHER);
                await swap(ONE_ETHER);
                await swap(ONE_ETHER);
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
                prime = await createPrime();
                tokenP = prime.address;
                redeem = await createRedeem();
                tokenR = redeem.address;
                await prime.initTokenR(tokenR);
            });

            it("should update the cached balances with the current balances", async () => {
                await _tokenU.mint(Alice, THOUSAND_ETHER);
                let inTokenU = THOUSAND_ETHER;
                let inTokenS = new BN(inTokenU)
                    .mul(new BN(price))
                    .div(new BN(base));
                await _tokenS.deposit({ from: Alice, value: inTokenS });
                await mint(inTokenU);
                await _tokenU.transfer(tokenP, inTokenU, { from: Alice });
                await _tokenS.transfer(tokenP, inTokenS, { from: Alice });
                await redeem.transfer(tokenP, inTokenS, { from: Alice });
                let update = await prime.update();

                let cacheU = await getCache("u");
                let cacheS = await getCache("s");
                let cacheR = await getCache("r");
                let balanceR = await getBalance(redeem, tokenP);
                let balanceU = await getBalance(_tokenU, tokenP);
                let balanceS = await getBalance(_tokenS, tokenP);

                assertBNEqual(cacheU, balanceU);
                assertBNEqual(cacheS, balanceS);
                assertBNEqual(cacheR, balanceR);

                await truffleAssert.eventEmitted(update, "Fund", (ev) => {
                    return (
                        expect(ev.cacheU.toString()).to.be.eq(
                            cacheU.toString()
                        ) &&
                        expect(ev.cacheS.toString()).to.be.eq(
                            cacheS.toString()
                        ) &&
                        expect(ev.cacheR.toString()).to.be.eq(cacheR.toString())
                    );
                });
            });
        });

        describe("take", () => {
            beforeEach(async () => {
                prime = await createPrime();
                tokenP = prime.address;
                redeem = await createRedeem();
                tokenR = redeem.address;
                await prime.initTokenR(tokenR);
            });

            it("should take the balances which are not in the cache", async () => {
                await _tokenU.mint(Alice, THOUSAND_ETHER);
                await _tokenU.mint(Alice, THOUSAND_ETHER);
                let inTokenU = THOUSAND_ETHER;
                let inTokenS = new BN(inTokenU)
                    .mul(new BN(price))
                    .div(new BN(base));
                await _tokenS.deposit({ from: Alice, value: inTokenS });
                await mint(inTokenU);
                await _tokenU.transfer(tokenP, inTokenU, { from: Alice });
                await _tokenS.transfer(tokenP, inTokenS, { from: Alice });
                await redeem.transfer(tokenP, inTokenS, { from: Alice });
                let take = await prime.take();

                let cacheU = await getCache("u");
                let cacheS = await getCache("s");
                let cacheR = await getCache("r");
                let balanceR = await getBalance(redeem, tokenP);
                let balanceU = await getBalance(_tokenU, tokenP);
                let balanceS = await getBalance(_tokenS, tokenP);

                assertBNEqual(cacheU, balanceU);
                assertBNEqual(cacheS, balanceS);
                assertBNEqual(cacheR, balanceR);
            });
        });

        describe("test expired", () => {
            beforeEach(async () => {
                prime = await PrimeOptionTest.new(
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
                redeem = await createRedeem();
                tokenR = redeem.address;
                await prime.initTokenR(tokenR);
                let inTokenU = THOUSAND_ETHER;
                await _tokenU.mint(Alice, inTokenU);
                await _tokenU.transfer(tokenP, inTokenU);
                await prime.mint(Alice);
                let expired = "1589386232";
                await prime.setExpiry(expired);
                assert.equal(await prime.expiry(), expired);
            });

            it("should close position with just redeem tokens after expiry", async () => {
                let cache0U = await getCache("u");
                let cache0S = await getCache("s");
                let balance0R = await redeem.totalSupply();
                let balance0U = await getBalance(_tokenU, Alice);
                let balance0CU = await getBalance(_tokenU, tokenP);
                let balance0S = await getBalance(_tokenS, tokenP);

                let inTokenR = await redeem.balanceOf(Alice);
                await redeem.transfer(tokenP, inTokenR);
                await prime.close(Alice);

                let balance1R = await redeem.totalSupply();
                let balance1U = await getBalance(_tokenU, Alice);
                let balance1CU = await getBalance(_tokenU, tokenP);
                let balance1S = await getBalance(_tokenS, tokenP);

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
                await truffleAssert.reverts(prime.swap(Alice), ERR_EXPIRED);
            });
        });

        /* describe("test bad ERC20", () => {
            beforeEach(async () => {
                _tokenU = await BadToken.new(
                    "Bad ERC20 Doesnt Return Bools",
                    "BADU"
                );
                _tokenS = await BadToken.new(
                    "Bad ERC20 Doesnt Return Bools",
                    "BADS"
                );
                tokenU = _tokenU.address;
                tokenS = _tokenS.address;
                prime = await PrimeOptionTest.new(
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
                redeem = await createRedeem();
                tokenR = redeem.address;
                await prime.initTokenR(tokenR);
                let inTokenU = THOUSAND_ETHER;
                await _tokenU.mint(Alice, inTokenU);
                await _tokenS.mint(Alice, inTokenU);
                await _tokenU.transfer(tokenP, inTokenU);
                await prime.mint(Alice);
            });

            it("should revert on swap because transfer does not return a boolean", async () => {
                let inTokenP = HUNDRED_ETHER;
                let inTokenS = toWei("0.5"); // 100 ether (tokenU:base) / 200 (tokenS:price) = 0.5 tokenS
                await _tokenS.transfer(tokenP, inTokenS);
                await prime.transfer(tokenP, inTokenP);
                await truffleAssert.reverts(prime.swap(Alice));
            });

            it("should revert on redeem because transfer does not return a boolean", async () => {
                // no way to swap, because it reverts, so we need to send tokenS and call update()
                let inTokenS = toWei("0.5"); // 100 ether (tokenU:base) / 200 (tokenS:price) = 0.5 tokenS
                await _tokenS.transfer(tokenP, inTokenS);
                await prime.update();
                await redeem.transfer(tokenP, inTokenS);
                await truffleAssert.reverts(prime.redeem(Alice));
            });

            it("should revert on close because transfer does not return a boolean", async () => {
                // no way to swap, because it reverts, so we need to send tokenS and call update()
                let inTokenP = HUNDRED_ETHER;
                let inTokenR = toWei("0.5"); // 100 ether (tokenU:base) / 200 (tokenS:price) = 0.5 tokenS
                await redeem.transfer(tokenP, inTokenR);
                await prime.transfer(tokenP, inTokenP);
                await truffleAssert.reverts(prime.close(Alice));
            });
        }); */
    });
});
