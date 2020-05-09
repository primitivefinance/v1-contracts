const { assert, expect } = require("chai");
const chai = require('chai');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const PrimeOption = artifacts.require("PrimeOption");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const Weth = artifacts.require("WETH9");
const Dai = artifacts.require("DAI");

contract("Prime", accounts => {
    // WEB3
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;

    // ERROR CODES
    const ERR_ZERO = "ERR_ZERO";
    const ERR_BAL_ETH = "ERR_BAL_ETH";
    const ERR_NOT_OWNER = "ERR_NOT_OWNER";
    const ERR_BAL_PRIME = "ERR_BAL_PRIME";
    const ERR_BAL_STRIKE = "ERR_BAL_STRIKE";
    const ERR_BAL_REDEEM = "ERR_BAL_REDEEM";
    const ERR_BAL_TOKENS = "ERR_BAL_TOKENS";
    const ERR_BAL_OPTIONS = "ERR_BAL_OPTIONS";
    const ERR_OPTION_TYPE = "ERR_OPTION_TYPE";
    const ERR_BAL_UNDERLYING = "ERR_BAL_UNDERLYING";

    // COMMON AMOUNTS
    const ROUNDING_ERR = 10**8;
    const HUNDRETH = toWei('0.01');
    const ONE_ETHER = toWei('1');
    const TWO_ETHER = toWei('2');
    const FIVE_ETHER = toWei('5');
    const TEN_ETHER = toWei('10');
    const FIFTY_ETHER = toWei('50');
    const HUNDRED_ETHER = toWei('100');
    const THOUSAND_ETHER = toWei('1000');
    const MILLION_ETHER = toWei('1000000');
    const MIN_LIQUIDITY = 10**4;
    const ACCURACY = 10**12;

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
        redeem = await createRedeem();
        tokenP = prime.address;
        tokenR = redeem.address
        await prime.initTokenR(tokenR);

        getBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
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
                0,
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

        describe('PrimeOption.mint()', () => {

            it('revert if no tokens were sent to contract', async () => {
                await truffleAssert.reverts(
                    prime.mint(
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_ZERO"
                );
            });

            it('mint tokenP and tokenR to Alice', async () => {
                let inTokenU = ONE_ETHER;
                let balanceER = inTokenU*1 * price*1 / toWei('1');
                let balanceEP = ONE_ETHER;

                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                let mint = await prime.mint(Alice, {from: Alice});

                let balanceAR = await _tokenR.balanceOf(Alice);
                let balanceAP = await prime.balanceOf(Alice);

                assert.equal(balanceAR, balanceER, `${balanceAR} != ${balanceER}`);
                assert.equal(balanceAP, balanceEP, `${balanceAP} != ${balanceEP}`);

                let balanceU = await _tokenU.methods.balanceOf(tokenP).call();
                let cacheU = await prime.cacheU();

                assert.equal(balanceU, inTokenU, `${balanceU} != ${inTokenU}`)
                assert.equal(cacheU, inTokenU, `${cacheU} != ${inTokenU}`)

                truffleAssert.eventEmitted(mint, "Mint");
                truffleAssert.eventEmitted(mint, "Fund");
            });

            it('send 1 wei of tokenU to tokenP and call mint', async () => {
                let inTokenU = '1';
                let differenceE = (inTokenU*1 * price*1 / toWei('1')).toString();
                let balanceER = (await _tokenR.balanceOf(Alice)).toString();
                let balanceEP = (await prime.balanceOf(Alice)).toString();
                let balanceEU = (await _tokenU.methods.balanceOf(tokenP).call()).toString();
                let cacheEU = (await prime.cacheU()).toString();

                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                let mint = await prime.mint(Alice, {from: Alice});

                let balanceAR = (await _tokenR.balanceOf(Alice)).toString();
                let balanceAP = (await prime.balanceOf(Alice)).toString();

                let differenceR = balanceAR*1 - balanceER*1;
                let differenceP = balanceAP*1 - balanceEP*1;
                
                assert.equal(differenceR <= ROUNDING_ERR, true, `${balanceAR} != ${balanceER}`);
                assert.equal(differenceP <= ROUNDING_ERR, true, `${balanceAP} != ${balanceEP}`);

                let balanceU = (await _tokenU.methods.balanceOf(tokenP).call()).toString();
                let cacheU = (await prime.cacheU()).toString();

                assert.isAtMost(balanceU*1 - balanceEU*1, ROUNDING_ERR);
                assert.equal((balanceU*1 - balanceEU*1) <= ROUNDING_ERR, true, `${balanceU*1 - balanceEU*1} != ${inTokenU}`)
                assert.equal((cacheU*1 - cacheEU*1) <= ROUNDING_ERR, true, `${cacheU*1 - cacheEU*1} != ${inTokenU}`)

                truffleAssert.eventEmitted(mint, "Mint");
                truffleAssert.eventEmitted(mint, "Fund");
            });
        });

        
        describe('PrimeOption.swap()', () => {
            it('reverts if inTokenS is 0', async () => {
                await prime.transfer(tokenP, ONE_ETHER);
                await truffleAssert.reverts(
                    prime.swap(
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_ZERO"
                );
                await prime.take();
            });

            it('reverts if inTokenP is 0', async () => {
                await _tokenS.transfer(tokenP, ONE_ETHER);
                await truffleAssert.reverts(
                    prime.swap(
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_ZERO"
                );
                await prime.take();
            });

            it('reverts if outTokenU > inTokenP', async () => {
                await prime.transfer(tokenP, toWei('0.01'));
                await _tokenS.transfer(tokenP, price);
                await truffleAssert.reverts(
                    prime.swap(
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_BAL_UNDERLYING"
                );
                await prime.take();
            });

            it('swaps tokenS + tokenP for tokenU', async () => {
                let inTokenU = ONE_ETHER;
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                await prime.mint(Alice, {from: Alice});
                await prime.take();
                await prime.update();

                let inTokenS = price*1 * ONE_ETHER*1 / toWei('1');
                let inTokenP = ONE_ETHER;
                let outTokenU = ONE_ETHER;

                let balance0S = await _tokenS.balanceOf(Alice);
                let balance0P = await prime.balanceOf(Alice);
                let balance0U = await _tokenU.methods.balanceOf(Alice).call();

                let balance0SC = await _tokenS.balanceOf(tokenP);
                let balance0UC = await _tokenU.methods.balanceOf(tokenP).call();

                await _tokenS.transfer(tokenP, (inTokenS).toString());
                await prime.transfer(tokenP, inTokenP);
                let swap = await prime.swap(Alice);
                truffleAssert.prettyPrintEmittedEvents(swap);

                let balance1S = await _tokenS.balanceOf(Alice);
                let balance1P = await prime.balanceOf(Alice);
                let balance1U = await _tokenU.methods.balanceOf(Alice).call();

                let balance1SC = await _tokenS.balanceOf(tokenP);
                let balance1UC = await _tokenU.methods.balanceOf(tokenP).call();

                let deltaS = balance1S - balance0S;
                let deltaP = balance1P - balance0P;
                let deltaU = balance1U - balance0U;
                let deltaSC = balance1SC - balance0SC;
                let deltaUC = balance1UC - balance0UC;

                expect(deltaS).to.be.eq(-inTokenS);
                expect(deltaP).to.be.eq(-inTokenP);
                expect(deltaU).to.be.eq(+outTokenU);
                expect(deltaSC).to.be.eq(+inTokenS);
                expect(deltaUC).to.be.eq(-outTokenU);

                truffleAssert.eventEmitted(swap, "Swap", (ev) => {
                    return ev.outTokenU == inTokenP && ev.inTokenS == inTokenS;
                });
                truffleAssert.eventEmitted(swap, "Fund");
            });
        });

        
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
        });
    });
});