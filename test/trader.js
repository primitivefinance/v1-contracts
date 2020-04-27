const assert = require('chai').assert;
const chai = require('chai');
const BN = require('bn.js');
// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));
const expect = require('chai').expect;
const truffleAssert = require('truffle-assertions');
const ControllerMarket = artifacts.require('ControllerMarket');
const ControllerPool = artifacts.require('ControllerPool');
const ControllerOption = artifacts.require('ControllerOption');
const PrimeOption = artifacts.require('PrimeOption.sol');
const PrimeRedeem = artifacts.require('PrimeRedeem');
const PrimeTrader = artifacts.require("PrimeTrader.sol");
const Usdc = artifacts.require("USDC");
const Dai = artifacts.require('DAI');
const Weth = require('../build/contracts/WETH9.json');

contract('PrimeTrader.sol', accounts => {
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const { getBalance } = web3.eth;
    const ERR_ZERO = "ERR_ZERO";
    const ERR_BAL_ETH = "ERR_BAL_ETH";
    const ERR_NOT_OWNER = "ERR_NOT_OWNER";
    const ERR_BAL_PRIME = "ERR_BAL_PRIME";
    const ERR_BAL_STRIKE = "ERR_BAL_STRIKE";
    const ERR_BAL_REDEEM = "ERR_BAL_REDEEM";
    const ERR_BAL_TOKENS = "ERR_BAL_TOKENS";
    const ERR_BAL_OPTIONS = "ERR_BAL_OPTIONS";
    const ERR_OPTION_TYPE = "ERR_OPTION_TYPE";
    const ROUNDING_ERR = 10**5;
    const ONE_ETHER = toWei('0.1');
    const TWO_ETHER = toWei('0.2');
    const FIVE_ETHER = toWei('0.5');
    const TEN_ETHER = toWei('1');
    const FIFTY_ETHER = toWei('50');
    const MILLION_ETHER = toWei('1000000');
    const MAINNET_ORACLE = '0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9';
    const MAINNET_COMPOUND_ETH = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    

    // User Accounts
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

    let firstMarket;

    let _controllerMarket,
        _controllerPool,
        _controllerOption,
        WETH,
        tokenP,
        tokenR,
        _tokenP,
        _tokenR,
        _tokenU,
        _tokenS,
        name,
        symbol,
        tokenU,
        tokenS,
        base,
        price,
        expiry,
        strikePrice,
        trader
        ;

    async function sendWeth(weth, to, from, amount) {
        await weth.methods.transfer(to, amount).send({from: from});
    }

    before(async () => {
        // trader
        trader = await PrimeTrader.deployed();

        // Get the Market Controller Contract
        _controllerMarket = await ControllerMarket.deployed();
        _controllerPool = await ControllerPool.deployed();
        _controllerOption = await ControllerOption.deployed();

        WETH = new web3.eth.Contract(Weth.abi, await _controllerPool.weth());

        _tokenS = await Usdc.deployed();
        _tokenU = WETH;

        name = 'ETH201212C150USDC';
        symbol = 'PRIME';
        tokenS = _tokenS.address;
        tokenU = _tokenU._address;
        expiry = '1607774400';
        base = toWei('1');
        price = toWei('10');

        // Create a new Eth Option Market
        firstMarket = 1;
        await _controllerMarket.createMarket(
            name,
            symbol,
            tokenU,
            tokenS,
            base,
            price,
            expiry
        );

        _tokenP = await PrimeOption.at(await _controllerMarket.getOption(firstMarket));
        _tokenR = await PrimeRedeem.at(await _tokenP.tokenR());
        tokenP = _tokenP.address;
        tokenR = _tokenR.address;

        await _tokenU.methods.deposit().send({from: Alice, value: TEN_ETHER});
        await _tokenU.methods.deposit().send({from: Bob, value: TEN_ETHER});

        await _tokenS.approve(_tokenP.address, MILLION_ETHER, {from: Alice});
        await _tokenU.methods.approve(_tokenP.address, MILLION_ETHER).send({from: Alice});

        await _tokenS.approve(_tokenP.address, MILLION_ETHER, {from: Bob});
        await _tokenU.methods.approve(_tokenP.address, MILLION_ETHER).send({from: Bob});

        await _tokenS.approve(trader.address, MILLION_ETHER, {from: Alice});
        await _tokenU.methods.approve(trader.address, MILLION_ETHER).send({from: Alice});

        await _tokenS.approve(trader.address, MILLION_ETHER, {from: Bob});
        await _tokenU.methods.approve(trader.address, MILLION_ETHER).send({from: Bob});

        await _tokenP.approve(trader.address, MILLION_ETHER, {from: Alice});
        await _tokenP.approve(trader.address, MILLION_ETHER, {from: Bob});

        await _tokenR.approve(trader.address, MILLION_ETHER, {from: Alice});
        await _tokenR.approve(trader.address, MILLION_ETHER, {from: Bob});
    });

    describe('PrimeTrader.sol', () => {
        it('Should initialize with the correct values', async () => {
            let wethAddress = _tokenU._address;
            assert.equal(
                (await trader.weth()),
                (wethAddress),
                `Incorrect WETH Address ${await trader.weth()} != ${wethAddress}`
            );
        });

        describe('PrimeTrader.safeMint()', () => {

            it('revert if zero was the input for the amount parameter', async () => {
                await truffleAssert.reverts(
                    trader.safeMint(
                        tokenP,
                        0,
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_ZERO"
                );
            });

            it('reverts if msg.sender does not have enough tokenU', async () => {
                await truffleAssert.reverts(
                    trader.safeMint(
                        tokenP,
                        MILLION_ETHER,
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_BAL_UNDERLYING"
                );
            });

            it('mint tokenP and tokenR to Alice', async () => {
                let inTokenU = ONE_ETHER;
                let balanceER = inTokenU*1 * price*1 / toWei('1');
                let balanceEP = ONE_ETHER;

                let mint = await trader.safeMint(tokenP, inTokenU, Alice, {from: Alice});

                let balanceAR = await _tokenR.balanceOf(Alice);
                let balanceAP = await _tokenP.balanceOf(Alice);

                assert.equal(balanceAR, balanceER, `${balanceAR} != ${balanceER}`);
                assert.equal(balanceAP, balanceEP, `${balanceAP} != ${balanceEP}`);

                let balanceU = await _tokenU.methods.balanceOf(tokenP).call();
                let cacheU = await _tokenP.cacheU();

                assert.equal(balanceU, inTokenU, `${balanceU} != ${inTokenU}`)
                assert.equal(cacheU, inTokenU, `${cacheU} != ${inTokenU}`)

                truffleAssert.eventEmitted(mint, "Mint");
            });

            it('send 1 wei of tokenU to tokenP and call mint', async () => {
                let inTokenU = '1';
                let differenceE = (inTokenU*1 * price*1 / toWei('1')).toString();
                let balanceER = (await _tokenR.balanceOf(Alice)).toString();
                let balanceEP = (await _tokenP.balanceOf(Alice)).toString();
                let balanceEU = (await _tokenU.methods.balanceOf(tokenP).call()).toString();
                let cacheEU = (await _tokenP.cacheU()).toString();

                let mint = await trader.safeMint(tokenP, inTokenU, Alice, {from: Alice});

                let balanceAR = (await _tokenR.balanceOf(Alice)).toString();
                let balanceAP = (await _tokenP.balanceOf(Alice)).toString();

                let differenceR = balanceAR*1 - balanceER*1;
                let differenceP = balanceAP*1 - balanceEP*1;
                
                assert.equal(differenceR <= ROUNDING_ERR, true, `${balanceAR} != ${balanceER}`);
                assert.equal(differenceP <= ROUNDING_ERR, true, `${balanceAP} != ${balanceEP}`);

                let balanceU = (await _tokenU.methods.balanceOf(tokenP).call()).toString();
                let cacheU = (await _tokenP.cacheU()).toString();

                assert.isAtMost(balanceU*1 - balanceEU*1, ROUNDING_ERR);
                assert.equal((balanceU*1 - balanceEU*1) <= ROUNDING_ERR, true, `${balanceU*1 - balanceEU*1} != ${inTokenU}`)
                assert.equal((cacheU*1 - cacheEU*1) <= ROUNDING_ERR, true, `${cacheU*1 - cacheEU*1} != ${inTokenU}`)

                truffleAssert.eventEmitted(mint, "Mint");
            });
        });

        
        describe('PrimeTrader.safeSwap()', () => {
            it('reverts if inTokenS is 0', async () => {
                await truffleAssert.reverts(
                    trader.safeSwap(
                        tokenP,
                        0,
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_ZERO"
                );
            });

            it('reverts if user does not have enough tokenP', async () => {
                await truffleAssert.reverts(
                    trader.safeSwap(
                        tokenP,
                        MILLION_ETHER,
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_BAL_PRIME"
                );
            });

            /* it('reverts if user does not have enough strike assets', async () => {
                await truffleAssert.reverts(
                    trader.safeSwap(
                        tokenP,
                        ONE_ETHER,
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_BAL_STRIKE"
                );
            }); */

            it('swaps tokenS + tokenP for tokenU', async () => {
                let inTokenU = ONE_ETHER;
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                await _tokenP.mint(Alice, {from: Alice});
                await _tokenP.take();
                await _tokenP.update();

                let inTokenS = price*1 * ONE_ETHER*1 / toWei('1');
                let inTokenP = ONE_ETHER;
                let outTokenU = ONE_ETHER;

                let balance0S = await _tokenS.balanceOf(Alice);
                let balance0P = await _tokenP.balanceOf(Alice);
                let balance0U = await _tokenU.methods.balanceOf(Alice).call();

                let balance0SC = await _tokenS.balanceOf(tokenP);
                let balance0UC = await _tokenU.methods.balanceOf(tokenP).call();

                let swap = await trader.safeSwap(tokenP, (inTokenP).toString(), Alice);
                truffleAssert.prettyPrintEmittedEvents(swap);

                let balance1S = await _tokenS.balanceOf(Alice);
                let balance1P = await _tokenP.balanceOf(Alice);
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
            });
        });

        
        describe('PrimeTrader.safeRedeem()', () => {
            it('reverts if inTokenR is 0', async () => {
                await truffleAssert.reverts(
                    trader.safeRedeem(
                        tokenP,
                        0,
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_ZERO"
                );
            });

            it('reverts if not enough withdrawable strike', async () => {
                let inTokenU = TEN_ETHER;
                await _tokenU.methods.deposit().send({from: Alice, value: inTokenU});
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                await _tokenP.mint(Alice, {from: Alice});
                await truffleAssert.reverts(
                    trader.safeRedeem(
                        tokenP,
                        (price*1 * inTokenU*1 / toWei('1')).toString(),
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_BAL_STRIKE"
                );
            });

            it('withdraws strike assets using redeem tokens', async () => {
                let inTokenU = ONE_ETHER;
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                await _tokenP.mint(Alice, {from: Alice});
                await _tokenP.take();
                await _tokenP.update();

                let inTokenS = price*1 * ONE_ETHER*1 / toWei('1');
                let inTokenP = ONE_ETHER;
                let outTokenU = ONE_ETHER;
                let inTokenR = TEN_ETHER;
                let outTokenS = inTokenR;

                let balance0S = await _tokenS.balanceOf(Alice);
                let balance0P = await _tokenP.balanceOf(Alice);
                let balance0U = await _tokenU.methods.balanceOf(Alice).call();
                let balance0R = await _tokenR.balanceOf(Alice);

                let balance0SC = await _tokenS.balanceOf(tokenP);
                let balance0UC = await _tokenU.methods.balanceOf(tokenP).call();

                let redeem = await trader.safeRedeem(tokenP, (inTokenS).toString(), Alice);
                truffleAssert.prettyPrintEmittedEvents(redeem);

                let balance1S = await _tokenS.balanceOf(Alice);
                let balance1P = await _tokenP.balanceOf(Alice);
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
            });
        });

        
        describe('PrimeTrader.safeClose()', () => {
            it('reverts if inTokenR is 0', async () => {
                await _tokenP.take();
                await _tokenP.update();
                let inTokenP = ONE_ETHER;
                await truffleAssert.reverts(
                    trader.safeClose(
                        tokenP,
                        0,
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_ZERO"
                );
                await _tokenP.take();
            });

            it('reverts if user does not have enough redeem', async () => {
                await _tokenP.take();
                await _tokenP.update();
                let inTokenR = MILLION_ETHER;
                await truffleAssert.reverts(
                    trader.safeClose(
                        tokenP,
                        inTokenR,
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_BAL_REDEEM"
                );
                await _tokenP.take();
            });

            /* it('reverts if user does not have enough primes', async () => {
                await truffleAssert.reverts(
                    trader.safeClose(
                        tokenP,
                        toWei('0.01'),
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_BAL_PRIME"
                );
                await _tokenP.take();
            }); */


            it('closes position', async () => {
                let inTokenU = ONE_ETHER;
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                await _tokenP.mint(Alice, {from: Alice});
                await _tokenP.take();
                await _tokenP.update();

                let inTokenS = 0;
                let inTokenP = ONE_ETHER;
                let inTokenR = price*1 * ONE_ETHER*1 / toWei('1');
                let outTokenU = ONE_ETHER;
                let outTokenS = 0;

                let balance0S = await _tokenS.balanceOf(Alice);
                let balance0P = await _tokenP.balanceOf(Alice);
                let balance0U = await _tokenU.methods.balanceOf(Alice).call();
                let balance0R = await _tokenR.balanceOf(Alice);

                let balance0SC = await _tokenS.balanceOf(tokenP);
                let balance0UC = await _tokenU.methods.balanceOf(tokenP).call();

                let close = await trader.safeClose(tokenP, (inTokenP).toString(), Alice);
                truffleAssert.prettyPrintEmittedEvents(close);

                let balance1S = await _tokenS.balanceOf(Alice);
                let balance1P = await _tokenP.balanceOf(Alice);
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
            });
        });
    }); 
})