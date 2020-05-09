const {
    assert,
    expect
} = require("chai");
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const PrimeOption = artifacts.require("PrimeOption");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const Weth = artifacts.require("WETH9");
const Dai = artifacts.require("DAI");
const constants = require("./constants");
const {
    ERR_ZERO,
    ERR_BAL_PRIME,
    ERR_BAL_STRIKE,
    ERR_BAL_UNDERLYING,
    ERR_BAL_REDEEM,
    ERR_NOT_OWNER,
    ERR_PAUSED,
    ONE_ETHER,
    FIVE_ETHER,
    TEN_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
} = constants;

contract("Prime", accounts => {
    // WEB3
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;

    // ACCOUNTS
    const Alice = accounts[0]
    const Bob = accounts[1]


    let weth, dai, prime, redeem;
    let tokenU, tokenS, _tokenU, _tokenS, tokenP, tokenR;
    let base, price, expiry;

    const assertBNEqual = (actualBN, expectedBN, message) => {
        assert.equal(actualBN.toString(), expectedBN.toString(), message);
    }

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
        base = toWei('200');
        price = toWei('1');
        expiry = '1590868800'; // May 30, 2020, 8PM UTC

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
        }

        createRedeem = async () => {
            let redeem = await PrimeRedeem.new(
                redeemName,
                redeemSymbol,
                tokenP,
                tokenS
            );
            return redeem;
        }
        prime = await createPrime();
        tokenP = prime.address;
        redeem = await createRedeem();
        tokenR = redeem.address
        await prime.initTokenR(tokenR);

        getBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        }

        getCache = async (cache) => {
            switch(cache) {
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
        }
    });

    describe('Prime Option', () => {
        it('should return the correct name', async () => {
            assert.equal(
                (await prime.name()).toString(),
                optionName,
                'Incorrect name'
            );
        });

        it('should return the correct symbol', async () => {
            assert.equal(
                (await prime.symbol()).toString(),
                optionSymbol,
                'Incorrect symbol'
            );
        });

        it('should return the correct marketID', async () => {
            assert.equal(
                (await prime.marketId()).toString(),
                marketId,
                'Incorrect id'
            );
        });

        it('should return the correct tokenU', async () => {
            assert.equal(
                (await prime.tokenU()).toString(),
                tokenU,
                'Incorrect tokenU'
            );
        });

        it('should return the correct tokenS', async () => {
            assert.equal(
                (await prime.tokenS()).toString(),
                tokenS,
                'Incorrect tokenS'
            );
        });

        it('should return the correct tokenR', async () => {
            assert.equal(
                (await prime.tokenR()).toString(),
                tokenR,
                'Incorrect tokenR'
            );
        });

        it('should return the correct base', async () => {
            assert.equal(
                (await prime.base()).toString(),
                base,
                'Incorrect base'
            );
        });

        it('should return the correct price', async () => {
            assert.equal(
                (await prime.price()).toString(),
                price,
                'Incorrect price'
            );
        });

        it('should return the correct expiry', async () => {
            assert.equal(
                (await prime.expiry()).toString(),
                expiry,
                'Incorrect expiry'
            );
        });

        it('should return the correct initial cacheU', async () => {
            assert.equal(
                (await prime.cacheU()).toString(),
                0,
                'Incorrect cacheU'
            );
        });

        it('should return the correct initial cacheS', async () => {
            assert.equal(
                (await prime.cacheS()).toString(),
                0,
                'Incorrect cacheS'
            );
        });

        it('should return the correct initial cacheR', async () => {
            assert.equal(
                (await prime.cacheR()).toString(),
                0,
                'Incorrect cacheR'
            );
        });

        it('should return the correct initial factory', async () => {
            assert.equal(
                (await prime.factory()).toString(),
                Alice,
                'Incorrect factory'
            );
        });

        it('should return the correct name for redeem', async () => {
            assert.equal(
                (await redeem.name()).toString(),
                redeemName,
                'Incorrect name'
            );
        });

        it('should return the correct symbol for redeem', async () => {
            assert.equal(
                (await redeem.symbol()).toString(),
                redeemSymbol,
                'Incorrect symbol'
            );
        });

        it('should return the correct tokenP for redeem', async () => {
            assert.equal(
                (await redeem.tokenP()).toString(),
                tokenP,
                'Incorrect tokenP'
            );
        });

        it('should return the correct tokenS for redeem', async () => {
            assert.equal(
                (await redeem.tokenS()).toString(),
                tokenS,
                'Incorrect tokenS'
            );
        });

        it('should return the correct controller for redeem', async () => {
            assert.equal(
                (await redeem.controller()).toString(),
                Alice,
                'Incorrect controller'
            );
        });

        describe('kill', () => {

            it('revert if msg.sender is not owner', async () => {
                await truffleAssert.reverts(
                    prime.kill(
                        {from: Bob}
                    ),
                    ERR_NOT_OWNER
                );
            });

            it('should pause contract', async () => {
                await prime.kill();
                assert.equal(await prime.paused(), true);
            });

            it('should revert mint function call while paused contract', async () => {
                await truffleAssert.reverts(
                    prime.mint(Alice),
                    ERR_PAUSED
                );
            });

            it('should revert swap function call while paused contract', async () => {
                await truffleAssert.reverts(
                    prime.swap(Alice),
                    ERR_PAUSED
                );
            });

            it('should unpause contract', async () => {
                await prime.kill();
                assert.equal(await prime.paused(), false);
            });

        });

        describe('mint', () => {
            beforeEach(async () => {
                prime = await createPrime();
                tokenP = prime.address;
                redeem = await createRedeem();
                tokenR = redeem.address
                await prime.initTokenR(tokenR);
    
                mint = async (inTokenU) => {
                    inTokenU = new BN(inTokenU);
                    let outTokenR = inTokenU.mul(new BN(price)).div(new BN(base));
    
                    let balanceU = await getBalance(_tokenU, Alice);
                    let balanceP = await getBalance(prime, Alice);
                    let balanceR = await getBalance(redeem, Alice);
    
                    await _tokenU.transfer(tokenP, inTokenU, {from: Alice});
                    let event = await prime.mint(Alice);
    
                    let deltaU = (await getBalance(_tokenU, Alice)).sub(balanceU);
                    let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                    let deltaR = (await getBalance(redeem, Alice)).sub(balanceR);
    
                    assertBNEqual(deltaU, inTokenU.neg());
                    assertBNEqual(deltaP, inTokenU);
                    assertBNEqual(deltaR, outTokenR);
    
                    await truffleAssert.eventEmitted(event, "Mint", (ev) => {
                        return expect(ev.from).to.be.eq(Alice) &&
                            expect((ev.outTokenP).toString()).to.be.eq(inTokenU.toString()) &&
                            expect((ev.outTokenR).toString()).to.be.eq(outTokenR.toString())
                    });

                    let cacheU = await getCache("u");
                    let cacheS = await getCache("s");
                    let cacheR = await getCache("r");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return expect((ev.cacheU).toString()).to.be.eq(cacheU.toString()) &&
                            expect((ev.cacheS).toString()).to.be.eq(cacheS.toString()) &&
                            expect((ev.cacheR).toString()).to.be.eq(cacheR.toString())
                    });
                }
            });

            it('revert if no tokens were sent to contract', async () => {
                await truffleAssert.reverts(
                    prime.mint(
                        Alice
                    ),
                    ERR_ZERO
                );
            });

            it('mint tokenP and tokenR to Alice', async () => {
                let inTokenU = ONE_ETHER;
                await mint(inTokenU);
            });

            it('send 1 wei of tokenU to tokenP and call mint', async () => {
                let inTokenU = '1';
                await mint(inTokenU);
            });
        });

        describe('swap', () => {
            beforeEach(async () => {
                prime = await createPrime();
                tokenP = prime.address;
                redeem = await createRedeem();
                tokenR = redeem.address
                await prime.initTokenR(tokenR);
    
                swap = async (inTokenP) => {
                    inTokenP = new BN(inTokenP);
                    let inTokenS = inTokenP.mul(new BN(price)).div(new BN(base));
                    let outTokenU = inTokenP;
    
                    let balanceU = await getBalance(_tokenU, Alice);
                    let balanceP = await getBalance(prime, Alice);
                    let balanceS = await getBalance(_tokenS, Alice);
    
                    await prime.transfer(tokenP, inTokenP, {from: Alice});
                    await _tokenS.transfer(tokenP, inTokenS, {from: Alice});
                    let event = await prime.swap(Alice);
    
                    let deltaU = (await getBalance(_tokenU, Alice)).sub(balanceU);
                    let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                    let deltaR = (await getBalance(_tokenS, Alice)).sub(balanceS);
    
                    assertBNEqual(deltaU, outTokenU);
                    assertBNEqual(deltaP, inTokenP.neg());
                    assertBNEqual(deltaR, inTokenS.neg());
    
                    await truffleAssert.eventEmitted(event, "Swap", (ev) => {
                        return expect(ev.from).to.be.eq(Alice) &&
                            expect((ev.outTokenU).toString()).to.be.eq(outTokenU.toString()) &&
                            expect((ev.inTokenS).toString()).to.be.eq(inTokenS.toString())
                    });

                    let cacheU = await getCache("u");
                    let cacheS = await getCache("s");
                    let cacheR = await getCache("r");

                    await truffleAssert.eventEmitted(event, "Fund", (ev) => {
                        return expect((ev.cacheU).toString()).to.be.eq(cacheU.toString()) &&
                            expect((ev.cacheS).toString()).to.be.eq(cacheS.toString()) &&
                            expect((ev.cacheR).toString()).to.be.eq(cacheR.toString())
                    });
                }
            });

            it('revert if 0 tokenS and 0 tokenP were sent to contract', async () => {
                await truffleAssert.reverts(
                    prime.swap(
                        Alice
                    ),
                    ERR_ZERO
                );
            });

            it('reverts if outTokenU > inTokenP, not enough tokenP was sent in', async () => {
                await mint(toWei('0.01'));
                await prime.transfer(tokenP, toWei('0.01'));
                await _tokenS.deposit({from: Alice, value: price});
                await _tokenS.transfer(tokenP, price);
                await truffleAssert.reverts(
                    prime.swap(
                        Alice,
                        {from: Alice}
                    ),
                    ERR_BAL_UNDERLYING
                );
                await prime.take();
            });

            it('swaps consecutively', async () => {
                let inTokenP = ONE_ETHER;
                await mint(inTokenP);
                await _tokenS.deposit({from: Alice, value: price});
                await swap(toWei('0.1'));
                await swap(toWei('0.34521'));

                // Interesting, the two 0s at the end of this are necessary. If they are not 0s, the
                // returned value will be unequal because the accuracy of the mint is only 10^16.
                // This should be verified further.
                await swap('2323234235200');
            });
        });

        /*
        describe('PrimeOption.redeem()', () => {
            it('reverts if not enough withdrawable strike', async () => {
                let inTokenU = TEN_ETHER;
                await _tokenU.methods.deposit().send({from: Alice, value: inTokenU});
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                await prime.mint(Alice, {from: Alice});
                await _tokenR.transfer(tokenP, (price*1 * inTokenU*1 / toWei('1')).toString());
                await truffleAssert.reverts(
                    prime.redeem(
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_BAL_STRIKE"
                );
            });

            it('withdraws strike assets using redeem tokens', async () => {
                let inTokenU = ONE_ETHER;
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                await prime.mint(Alice, {from: Alice});
                await prime.take();
                await prime.update();

                let inTokenS = price*1 * ONE_ETHER*1 / toWei('1');
                let inTokenP = ONE_ETHER;
                let outTokenU = ONE_ETHER;
                let inTokenR = TEN_ETHER;
                let outTokenS = inTokenR;

                let balance0S = await _tokenS.balanceOf(Alice);
                let balance0P = await prime.balanceOf(Alice);
                let balance0U = await _tokenU.methods.balanceOf(Alice).call();
                let balance0R = await _tokenR.balanceOf(Alice);

                let balance0SC = await _tokenS.balanceOf(tokenP);
                let balance0UC = await _tokenU.methods.balanceOf(tokenP).call();

                await _tokenR.transfer(tokenP, (inTokenS).toString());
                let redeem = await prime.redeem(Alice);
                truffleAssert.prettyPrintEmittedEvents(redeem);

                let balance1S = await _tokenS.balanceOf(Alice);
                let balance1P = await prime.balanceOf(Alice);
                let balance1U = await _tokenU.methods.balanceOf(Alice).call();
                let balance1R = await _tokenR.balanceOf(Alice);

                let balance1SC = await _tokenS.balanceOf(tokenP);
                let balance1UC = await _tokenU.methods.balanceOf(tokenP).call();

                let deltaS = balance1S - balance0S;
                let deltaP = balance1P - balance0P;
                let deltaU = balance1U - balance0U;
                let deltaR = balance1R - balance0R;
                let deltaSC = balance1SC - balance0SC;
                let deltaUC = balance1UC - balance0UC;

                expect(deltaS).to.be.eq(+outTokenS);
                expect(deltaP).to.be.eq(+0);
                expect(deltaU).to.be.eq(+0);
                expect(deltaR).to.be.eq(-inTokenR);
                expect(deltaSC).to.be.eq(-outTokenS);
                expect(deltaUC).to.be.eq(+0);

                truffleAssert.eventEmitted(redeem, "Redeem", (ev) => {
                    return ev.inTokenR == inTokenR && ev.inTokenR == outTokenS;
                });
                truffleAssert.eventEmitted(redeem, "Fund");
            });
        });

        
        describe('PrimeOption.close()', () => {
            it('reverts if inTokenR is 0', async () => {
                await prime.take();
                await prime.update();
                let inTokenP = ONE_ETHER;
                await prime.transfer(tokenP, inTokenP);
                await truffleAssert.reverts(
                    prime.close(
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_ZERO"
                );
                await prime.take();
            });

            it('reverts if inTokenP is 0', async () => {
                await prime.take();
                await prime.update();
                let inTokenR = TEN_ETHER;
                await _tokenR.transfer(tokenP, inTokenR);
                await truffleAssert.reverts(
                    prime.close(
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_ZERO"
                );
                await prime.take();
            });

            it('reverts if outTokenU > inTokenP', async () => {
                await prime.transfer(tokenP, toWei('0.01'));
                await _tokenR.transfer(tokenP, price);
                await truffleAssert.reverts(
                    prime.close(
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_BAL_UNDERLYING"
                );
                await prime.take();
            });


            it('closes position', async () => {
                let inTokenU = ONE_ETHER;
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                await prime.mint(Alice, {from: Alice});
                await prime.take();
                await prime.update();

                let inTokenS = 0;
                let inTokenP = ONE_ETHER;
                let inTokenR = price*1 * ONE_ETHER*1 / toWei('1');
                let outTokenU = ONE_ETHER;
                let outTokenS = 0;

                let balance0S = await _tokenS.balanceOf(Alice);
                let balance0P = await prime.balanceOf(Alice);
                let balance0U = await _tokenU.methods.balanceOf(Alice).call();
                let balance0R = await _tokenR.balanceOf(Alice);

                let balance0SC = await _tokenS.balanceOf(tokenP);
                let balance0UC = await _tokenU.methods.balanceOf(tokenP).call();

                await _tokenR.transfer(tokenP, (inTokenR).toString());
                await prime.transfer(tokenP, (inTokenP).toString());
                let close = await prime.close(Alice);
                truffleAssert.prettyPrintEmittedEvents(close);

                let balance1S = await _tokenS.balanceOf(Alice);
                let balance1P = await prime.balanceOf(Alice);
                let balance1U = await _tokenU.methods.balanceOf(Alice).call();
                let balance1R = await _tokenR.balanceOf(Alice);

                let balance1SC = await _tokenS.balanceOf(tokenP);
                let balance1UC = await _tokenU.methods.balanceOf(tokenP).call();

                let deltaS = balance1S - balance0S;
                let deltaP = balance1P - balance0P;
                let deltaU = balance1U - balance0U;
                let deltaR = balance1R - balance0R;
                let deltaSC = balance1SC - balance0SC;
                let deltaUC = balance1UC - balance0UC;

                expect(deltaS).to.be.eq(+outTokenS);
                expect(deltaP).to.be.eq(-inTokenP);
                expect(deltaU).to.be.eq(+outTokenU);
                expect(deltaR).to.be.eq(-inTokenR);

                expect(deltaSC).to.be.eq(-outTokenS);
                expect(deltaUC).to.be.eq(-outTokenU);

                truffleAssert.eventEmitted(close, "Close", (ev) => {
                    return ev.inTokenP == +outTokenU && ev.inTokenP == +inTokenP;
                });
                truffleAssert.eventEmitted(close, "Fund");
            });
        });

        describe('PrimeOption Expired', () => {
            it('sets the conditions for the option to test expired', async () => {
                let inTokenU = ONE_ETHER;

                let inTokenS = price*1 * ONE_ETHER*1 / toWei('1');
                let inTokenP = ONE_ETHER;

                // Mint some options
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                let mint = await prime.mint(Alice, {from: Alice});

                // Swap some options
                await _tokenS.transfer(tokenP, (inTokenS).toString());
                await prime.transfer(tokenP, inTokenP);
                let swap = await prime.swap(Alice);

                // Expire the contract
                await prime.testExpire();

                // log the outstanding balances
                console.log('[CACHE U]', fromWei(await prime.cacheU()));
                console.log('[CACHE S]', fromWei(await prime.cacheS()));
                console.log('[CACHE R]', fromWei(await prime.cacheR()));
                console.log('[CACHE P]', fromWei(await prime.balanceOf(tokenP)));
                console.log('[BALANCE U]', fromWei(await _tokenU.methods.balanceOf(Alice).call()));
                console.log('[BALANCE S]', fromWei(await _tokenS.balanceOf(Alice)));
                console.log('[BALANCE R]', fromWei(await _tokenR.balanceOf(Alice)));
                console.log('[BALANCE P]', fromWei(await prime.balanceOf(Alice)));
            });

            it('reverts if calling mint when expired', async () => {
                await truffleAssert.reverts(
                    prime.mint(
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_EXPIRED"
                );
            });

            it('reverts if calling swap when expired', async () => {
                await truffleAssert.reverts(
                    prime.swap(
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_EXPIRED"
                );
            });


            it('closes position in a killed and expired environment', async () => {
                await prime.kill();
                let inTokenU = ONE_ETHER;
                await prime.take();
                await prime.update();

                let inTokenS = 0;
                let inTokenP = ONE_ETHER;
                let inTokenR = price*1 * ONE_ETHER*1 / toWei('1');
                let outTokenU = await prime.cacheU();
                let outTokenR = await _tokenR.balanceOf(Alice);
                let outTokenS = TEN_ETHER;

                let balance0S = await _tokenS.balanceOf(Alice);
                let balance0P = await prime.balanceOf(Alice);
                let balance0U = await _tokenU.methods.balanceOf(Alice).call();
                let balance0R = await _tokenR.balanceOf(Alice);

                let balance0SC = await _tokenS.balanceOf(tokenP);
                let balance0UC = await _tokenU.methods.balanceOf(tokenP).call();

                await _tokenR.transfer(tokenP, (inTokenR).toString());
                await prime.transfer(tokenP, (inTokenP).toString());
                let close = await prime.close(Alice);
                truffleAssert.prettyPrintEmittedEvents(close);
                console.log('[CACHE U]', fromWei(await prime.cacheU()));
                console.log('[CACHE S]', fromWei(await prime.cacheS()));
                console.log('[CACHE R]', fromWei(await prime.cacheR()));
                console.log('[CACHE P]', fromWei(await prime.balanceOf(tokenP)));
                console.log('[BALANCE U]', fromWei(await _tokenU.methods.balanceOf(Alice).call()));
                console.log('[BALANCE S]', fromWei(await _tokenS.balanceOf(Alice)));
                console.log('[BALANCE R]', fromWei(await _tokenR.balanceOf(Alice)));
                console.log('[BALANCE P]', fromWei(await prime.balanceOf(Alice)));

                await _tokenR.transfer(tokenP, (TEN_ETHER).toString());
                let redeem = await prime.redeem(Alice);
                console.log('[CACHE U]', fromWei(await prime.cacheU()));
                console.log('[CACHE S]', fromWei(await prime.cacheS()));
                console.log('[CACHE R]', fromWei(await prime.cacheR()));
                console.log('[CACHE P]', fromWei(await prime.balanceOf(tokenP)));
                console.log('[BALANCE U]', fromWei(await _tokenU.methods.balanceOf(Alice).call()));
                console.log('[BALANCE S]', fromWei(await _tokenS.balanceOf(Alice)));
                console.log('[BALANCE R]', fromWei(await _tokenR.balanceOf(Alice)));
                console.log('[BALANCE P]', fromWei(await prime.balanceOf(Alice)));

                await _tokenR.transfer(tokenP, await _tokenR.balanceOf(Alice));
                let close2 = await prime.close(Alice);
                truffleAssert.prettyPrintEmittedEvents(close2);
                console.log('[CACHE U]', fromWei(await prime.cacheU()));
                console.log('[CACHE S]', fromWei(await prime.cacheS()));
                console.log('[CACHE R]', fromWei(await prime.cacheR()));
                console.log('[CACHE P]', fromWei(await prime.balanceOf(tokenP)));
                console.log('[BALANCE U]', fromWei(await _tokenU.methods.balanceOf(Alice).call()));
                console.log('[BALANCE S]', fromWei(await _tokenS.balanceOf(Alice)));
                console.log('[BALANCE R]', fromWei(await _tokenR.balanceOf(Alice)));
                console.log('[BALANCE P]', fromWei(await prime.balanceOf(Alice)));

                let balance1S = await _tokenS.balanceOf(Alice);
                let balance1P = await prime.balanceOf(Alice);
                let balance1U = await _tokenU.methods.balanceOf(Alice).call();
                let balance1R = await _tokenR.balanceOf(Alice);

                let balance1SC = await _tokenS.balanceOf(tokenP);
                let balance1UC = await _tokenU.methods.balanceOf(tokenP).call();

                let deltaS = balance1S - balance0S;
                let deltaP = balance1P - balance0P;
                let deltaU = balance1U - balance0U;
                let deltaR = balance1R - balance0R;
                let deltaSC = balance1SC - balance0SC;
                let deltaUC = balance1UC - balance0UC;

                expect(deltaS).to.be.eq(+outTokenS);
                expect(deltaP).to.be.eq(-inTokenP);
                expect(deltaU).to.be.eq(+outTokenU);
                expect(deltaR).to.be.eq(-outTokenR);

                expect(deltaSC).to.be.eq(-outTokenS);
                expect(deltaUC).to.be.eq(-outTokenU);

                truffleAssert.eventEmitted(close, "Fund");

                console.log('[CACHE U]', fromWei(await prime.cacheU()));
                console.log('[CACHE S]', fromWei(await prime.cacheS()));
                console.log('[CACHE R]', fromWei(await prime.cacheR()));
                console.log('[CACHE P]', fromWei(await prime.balanceOf(tokenP)));
                console.log('[BALANCE U]', fromWei(await _tokenU.methods.balanceOf(Alice).call()));
                console.log('[BALANCE S]', fromWei(await _tokenS.balanceOf(Alice)));
                console.log('[BALANCE R]', fromWei(await _tokenR.balanceOf(Alice)));
                console.log('[BALANCE P]', fromWei(await prime.balanceOf(Alice)));
            });
        }); */
    });
});