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
const PrimePool = artifacts.require("PrimePool.sol");
const PrimeTrader = artifacts.require("PrimeTrader.sol");
const Usdc = artifacts.require("USDC");
const Dai = artifacts.require('DAI');
const Weth = require('../build/contracts/WETH9.json');

contract('Primitive', accounts => {
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
    const ROUNDING_ERR = 10**8;
    const ONE_ETHER = toWei('0.1');
    const TWO_ETHER = toWei('0.2');
    const FIVE_ETHER = toWei('0.5');
    const TEN_ETHER = toWei('1');
    const FIFTY_ETHER = toWei('50');
    const MILLION_ETHER = toWei('1000000');
    const MAINNET_ORACLE = '0xdA17fbEdA95222f331Cb1D252401F4b44F49f7A0';
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
        _pool,
        trader
        ;

    async function sendWeth(weth, to, from, amount) {
        await weth.methods.transfer(to, amount).send({from: from});
    }

    before(async () => {
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

        await _controllerMarket.createMaker(
            MAINNET_ORACLE,
            "ETH Short Put Pool Denominated in DAI",
            "spPULP",
            _tokenS.address, // USDC
            WETH._address // WETH
        );

        await _controllerMarket.createMarket(
            name,
            symbol,
            _tokenS.address, // USDC
            WETH._address, // WETH
            toWei('15'), // USDC
            toWei('0.1'), // WETH
            '1607774400'
        );
        
        _pool = await PrimePool.at(await _controllerMarket.getMaker(2));
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

        await _tokenS.approve(_pool.address, MILLION_ETHER, {from: Alice});
        await WETH.methods.approve(_pool.address, MILLION_ETHER).send({from: Alice});

        await _tokenS.approve(_pool.address, MILLION_ETHER, {from: Bob});
        await WETH.methods.approve(_pool.address, MILLION_ETHER).send({from: Bob});

        await _tokenP.approve(_pool.address, MILLION_ETHER, {from: Alice});
        await _tokenP.approve(_pool.address, MILLION_ETHER, {from: Bob});

        await _tokenR.approve(_pool.address, MILLION_ETHER, {from: Alice});
        await _tokenR.approve(_pool.address, MILLION_ETHER, {from: Bob});
    });

    describe('PrimeOption.sol', () => {
        it('Should deploy a new market', async () => {
            await _controllerMarket.createMarket(
                name,
                symbol,
                tokenU,
                tokenS,
                base,
                price,
                expiry
            );
        });

        it('Should initialize with the correct values', async () => {
            let marketId = await _tokenP.marketId();
            assert.equal(
                (await _tokenP.name()).toString(),
                name,
                'Incorrect name'
            );
            assert.equal(
                (await _tokenP.symbol()).toString(),
                symbol,
                'Incorrect symbol'
            );
            assert.equal(
                (await _tokenP.factory()).toString(),
                _controllerOption.address,
                'Incorrect factory'
            );
            assert.equal(
                (await _tokenP.marketId()).toString(),
                (firstMarket).toString(),
                'Incorrect market id'
            );
            assert.equal(
                (await _tokenP.tokenU()).toString(),
                tokenU,
                'Incorrect tokenU'
            );
            assert.equal(
                (await _tokenP.tokenS()).toString(),
                tokenS,
                'Incorrect tokenS'
            );
            assert.equal(
                (await _tokenP.base()).toString(),
                base,
                'Incorrect base'
            );
            assert.equal(
                (await _tokenP.price()).toString(),
                price,
                'Incorrect price'
            );
            assert.equal(
                (await _tokenP.expiry()).toString(),
                expiry,
                'Incorrect expiry'
            );
            const tokens = await _tokenP.getTokens();
            assert.equal(
                (tokens._tokenU).toString(),
                tokenU,
                'Incorrect tokenU'
            );
            assert.equal(
                (tokens._tokenS).toString(),
                tokenS,
                'Incorrect tokenS'
            );
            assert.equal(
                (tokens._tokenR).toString(),
                _tokenR.address,
                'Incorrect tokenR'
            );
            assert.equal(
                (await _tokenP.maxDraw()).toString(),
                '0',
                'CacheS should be 0'
            );
        });

        describe('PrimeOption.mint()', () => {

            it('revert if no tokens were sent to contract', async () => {
                await truffleAssert.reverts(
                    _tokenP.mint(
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
                let mint = await _tokenP.mint(Alice, {from: Alice});

                let balanceAR = await _tokenR.balanceOf(Alice);
                let balanceAP = await _tokenP.balanceOf(Alice);

                assert.equal(balanceAR, balanceER, `${balanceAR} != ${balanceER}`);
                assert.equal(balanceAP, balanceEP, `${balanceAP} != ${balanceEP}`);

                let balanceU = await _tokenU.methods.balanceOf(tokenP).call();
                let cacheU = await _tokenP.cacheU();

                assert.equal(balanceU, inTokenU, `${balanceU} != ${inTokenU}`)
                assert.equal(cacheU, inTokenU, `${cacheU} != ${inTokenU}`)

                truffleAssert.eventEmitted(mint, "Mint");
                truffleAssert.eventEmitted(mint, "Fund");
            });

            it('send 1 wei of tokenU to tokenP and call mint', async () => {
                let inTokenU = '1';
                let differenceE = (inTokenU*1 * price*1 / toWei('1')).toString();
                let balanceER = (await _tokenR.balanceOf(Alice)).toString();
                let balanceEP = (await _tokenP.balanceOf(Alice)).toString();
                let balanceEU = (await _tokenU.methods.balanceOf(tokenP).call()).toString();
                let cacheEU = (await _tokenP.cacheU()).toString();

                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                let mint = await _tokenP.mint(Alice, {from: Alice});

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
                truffleAssert.eventEmitted(mint, "Fund");
            });
        });

        
        describe('PrimeOption.swap()', () => {
            it('reverts if inTokenS is 0', async () => {
                await _tokenP.transfer(tokenP, ONE_ETHER);
                await truffleAssert.reverts(
                    _tokenP.swap(
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_ZERO"
                );
                await _tokenP.take();
            });

            it('reverts if inTokenP is 0', async () => {
                await _tokenS.transfer(tokenP, ONE_ETHER);
                await truffleAssert.reverts(
                    _tokenP.swap(
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_ZERO"
                );
                await _tokenP.take();
            });

            it('reverts if outTokenU > inTokenP', async () => {
                await _tokenP.transfer(tokenP, toWei('0.01'));
                await _tokenS.transfer(tokenP, price);
                await truffleAssert.reverts(
                    _tokenP.swap(
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_BAL_UNDERLYING"
                );
                await _tokenP.take();
            });

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

                await _tokenS.transfer(tokenP, (inTokenS).toString());
                await _tokenP.transfer(tokenP, inTokenP);
                let swap = await _tokenP.swap(Alice);
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
                truffleAssert.eventEmitted(swap, "Fund");
            });
        });

        
        describe('PrimeOption.redeem()', () => {
            it('reverts if not enough withdrawable strike', async () => {
                let inTokenU = TEN_ETHER;
                await _tokenU.methods.deposit().send({from: Alice, value: inTokenU});
                await _tokenU.methods.transfer(tokenP, inTokenU).send({from: Alice});
                await _tokenP.mint(Alice, {from: Alice});
                await _tokenR.transfer(tokenP, (price*1 * inTokenU*1 / toWei('1')).toString());
                await truffleAssert.reverts(
                    _tokenP.redeem(
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

                await _tokenR.transfer(tokenP, (inTokenS).toString());
                let redeem = await _tokenP.redeem(Alice);
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
                truffleAssert.eventEmitted(redeem, "Fund");
            });
        });

        
        describe('PrimeOption.close()', () => {
            it('reverts if inTokenR is 0', async () => {
                await _tokenP.take();
                await _tokenP.update();
                let inTokenP = ONE_ETHER;
                await _tokenP.transfer(tokenP, inTokenP);
                await truffleAssert.reverts(
                    _tokenP.close(
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_ZERO"
                );
                await _tokenP.take();
            });

            it('reverts if inTokenP is 0', async () => {
                await _tokenP.take();
                await _tokenP.update();
                let inTokenR = TEN_ETHER;
                await _tokenR.transfer(tokenP, inTokenR);
                await truffleAssert.reverts(
                    _tokenP.close(
                        Alice,
                        {from: Alice, value: 0}),
                    "ERR_ZERO"
                );
                await _tokenP.take();
            });

            it('reverts if outTokenU > inTokenP', async () => {
                await _tokenP.transfer(tokenP, toWei('0.01'));
                await _tokenR.transfer(tokenP, price);
                await truffleAssert.reverts(
                    _tokenP.close(
                        Alice,
                        {from: Alice}
                    ),
                    "ERR_BAL_UNDERLYING"
                );
                await _tokenP.take();
            });


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

                await _tokenR.transfer(tokenP, (inTokenR).toString());
                await _tokenP.transfer(tokenP, (inTokenP).toString());
                let close = await _tokenP.close(Alice);
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
                truffleAssert.eventEmitted(close, "Fund");
            });
        });
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
                let outTokenR = inTokenU*1 * price*1 / toWei('1');
                let outTokenP = inTokenU;

                let balanceER = await _tokenR.balanceOf(Alice);
                let balanceEP = await _tokenP.balanceOf(Alice);

                let balanceEU = await _tokenU.methods.balanceOf(tokenP).call();
                let cacheEU = await _tokenP.cacheU();

                let mint = await trader.safeMint(tokenP, inTokenU, Alice, {from: Alice});

                let balanceAR = await _tokenR.balanceOf(Alice);
                let balanceAP = await _tokenP.balanceOf(Alice);

                let deltaR = balanceAR - balanceER;
                let deltaP = balanceAP - balanceEP;

                expect(deltaR).to.be.eq(+outTokenR);
                expect(deltaP).to.be.eq(+outTokenP);

                let balanceAU = await _tokenU.methods.balanceOf(tokenP).call();
                let cacheAU = await _tokenP.cacheU();

                let deltaU = balanceAU - balanceEU;
                let deltaCacheU = cacheAU - cacheEU;

                expect(deltaU).to.be.eq(+inTokenU);
                expect(deltaCacheU).to.be.eq(+inTokenU);

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

    describe('PrimePool.sol', () => {
        before(async () => {
            console.log('[TOKEN U BEFORE]', (await Usdc.deployed()).address);
            console.log('[TOKEN S BEFORE]', WETH._address);
            _tokenS = WETH;
            _tokenU = await Usdc.deployed();
            
            name = 'ETH201212C150USDC';
            symbol = 'PRIME';
            tokenU = _tokenU.address; // USDC
            tokenS = WETH._address; // WETH
            expiry = '1588334400';
            base = toWei('200');
            price = toWei('1');

            console.log('[TOKEN U AFTER]', tokenU);
            console.log('[TOKEN S BEFORE]', WETH._address);

            _pool = await PrimePool.at(await _controllerMarket.getMaker(2));
            _tokenP = await PrimeOption.at(await _controllerMarket.getOption(2));
            _tokenR = await PrimeRedeem.at(await _tokenP.tokenR());
            tokenP = _tokenP.address;
            tokenR = _tokenR.address;
            tokenPULP = _pool.address;
            _tokenPULP = _pool;

            await WETH.methods.deposit().send({from: Alice, value: TEN_ETHER});
            await WETH.methods.deposit().send({from: Bob, value: TEN_ETHER});

            await _tokenU.approve(_tokenP.address, MILLION_ETHER, {from: Alice});
            await WETH.methods.approve(_tokenP.address, MILLION_ETHER).send({from: Alice});

            await _tokenU.approve(_tokenP.address, MILLION_ETHER, {from: Bob});
            await WETH.methods.approve(_tokenP.address, MILLION_ETHER).send({from: Bob});

            await _tokenU.approve(_pool.address, MILLION_ETHER, {from: Alice});
            await WETH.methods.approve(_pool.address, MILLION_ETHER).send({from: Alice});

            await _tokenU.approve(_pool.address, MILLION_ETHER, {from: Bob});
            await WETH.methods.approve(_pool.address, MILLION_ETHER).send({from: Bob});

            await _tokenP.approve(_pool.address, MILLION_ETHER, {from: Alice});
            await _tokenP.approve(_pool.address, MILLION_ETHER, {from: Bob});

            await _tokenR.approve(_pool.address, MILLION_ETHER, {from: Alice});
            await _tokenR.approve(_pool.address, MILLION_ETHER, {from: Bob});

            await _tokenU.approve(trader.address, MILLION_ETHER, {from: Alice});
            await _tokenS.methods.approve(trader.address, MILLION_ETHER).send({from: Alice});

            await _tokenU.approve(trader.address, MILLION_ETHER, {from: Bob});
            await _tokenS.methods.approve(trader.address, MILLION_ETHER).send({from: Bob});

            await _tokenP.approve(trader.address, MILLION_ETHER, {from: Alice});
            await _tokenP.approve(trader.address, MILLION_ETHER, {from: Bob});

            await _tokenR.approve(trader.address, MILLION_ETHER, {from: Alice});
            await _tokenR.approve(trader.address, MILLION_ETHER, {from: Bob});
        });

        it('Should initialize with the correct values', async () => {
            let wethAddress = WETH._address;
            assert.equal(
                (await _pool.weth()),
                (wethAddress),
                `Incorrect WETH Address ${await _pool.weth()} != ${wethAddress}`
            );
        });

        /* it('Should initialize with the correct tokenU', async () => {
            assert.equal(
                (await _pool.tokenU()),
                (tokenU),
                `Incorrect tokenU`
            );
        });

        it('Should initialize with the correct tokenS', async () => {
            assert.equal(
                (await _pool.tokenS()),
                (tokenS),
                `Incorrect tokenS`
            );
        }); */

        it('Should initialize with the correct oracle', async () => {
            assert.equal(
                (await _pool.oracle()),
                (MAINNET_ORACLE),
                `Incorrect oracle`
            );
        });

        /* it('Should initialize with the correct option market', async () => {
            assert.equal(
                (await _pool.isValidOption(tokenP)),
                (true),
                `Incorrect tokenS`
            );
        }); */

        /* it('Should initialize with the correct option market in array', async () => {
            assert.equal(
                (await _pool._optionMarkets(firstMarket)),
                (tokenP),
                `Incorrect tokenS`
            );
        }); */

        describe('PrimePool.deposit()', () => {

            it('revert if zero was the input for the amount parameter', async () => {
                await truffleAssert.reverts(
                    _pool.deposit(
                        0,
                        tokenP,
                        {from: Alice, value: 0}
                    ),
                    "ERR_BAL_UNDERLYING"
                );
            });

            it('mint tokenPULP to Alice for tokenU by deposit', async () => {
                let inTokenU = ONE_ETHER;
                let outTokenPULP = inTokenU;

                let balance0U = await _tokenU.balanceOf(Alice);
                let balance0PULP = await _pool.balanceOf(Alice);

                let balance0UC = await _tokenU.balanceOf(tokenPULP);
                let balance0SC = await _pool.totalSupply();

                let deposit = await _pool.deposit(inTokenU, tokenP, {from: Alice});

                let balance1U = await _tokenU.balanceOf(Alice);
                let balance1PULP = await _pool.balanceOf(Alice);

                let balance1UC = await _tokenU.balanceOf(tokenPULP);
                let balance1SC = await _pool.totalSupply();

                let deltaPULP = balance1PULP - balance0PULP;
                let deltaU = balance1U - balance0U;
                let deltaSC = balance1SC - balance0SC;
                let deltaUC = balance1UC - balance0UC;

                expect(deltaPULP).to.be.eq(+outTokenPULP);
                expect(deltaU).to.be.eq(-inTokenU);
                expect(deltaSC).to.be.eq(+outTokenPULP);
                expect(deltaUC).to.be.eq(+inTokenU);

                truffleAssert.eventEmitted(deposit, "Deposit");
                console.log('[BASE]', fromWei(await _tokenP.base()));
                console.log('[PRICE]', fromWei(await _tokenP.price()));
                let premium = await _pool.calculatePremium(
                    await _tokenP.base(),
                    await _tokenP.price(),
                    await _tokenP.expiry()
                );
                
                console.log('[PREMIUM CALCULATED]', fromWei(premium.premium));
                console.log('[SQRT CALCULATED]', (await _pool.sqrt(premium.timeRemainder)).toString());
                console.log('[TIME REMAINING]', (premium.timeRemainder).toString());
            });

            it('should be able to withdraw tokenU if no tokenR is in contract', async () => {
                let inTokenPULP = await _pool.balanceOf(Alice);
                let outTokenU = inTokenPULP*1 * await _tokenU.balanceOf(_pool.address) / await _pool.totalSupply();
                let outTokenS = inTokenPULP*1 * await _tokenR.balanceOf(_pool.address) / await _pool.totalSupply();
                let outTokenR = outTokenS; // FIX

                let balance0U = await _tokenU.balanceOf(Alice); 
                let balance0P = await _pool.balanceOf(Alice);
                let balance0S = await WETH.methods.balanceOf(Alice).call();

                let balance0UC = await _tokenU.balanceOf(tokenP);
                let balance0SC = await WETH.methods.balanceOf(tokenP).call();

                console.log('[CACHE U]', fromWei(await _tokenU.balanceOf(tokenPULP)));
                console.log('[CACHE S]', fromWei(await WETH.methods.balanceOf(tokenPULP).call()));
                console.log('[BALANCE U]', fromWei(balance0U));
                console.log('[BALANCE S]', fromWei(balance0S));
                console.log('[BALANCE P]', fromWei(balance0P));

                let withdraw = await _pool.withdraw((inTokenPULP).toString(), tokenP);
                truffleAssert.prettyPrintEmittedEvents(withdraw);

                let balance1U = await _tokenU.balanceOf(Alice);
                let balance1P = await _pool.balanceOf(Alice);
                let balance1S = await WETH.methods.balanceOf(Alice).call();

                let balance1UC = await _tokenU.balanceOf(tokenP);
                let balance1SC = await WETH.methods.balanceOf(tokenP).call();

                let deltaS = balance1S - balance0S;
                let deltaP = balance1P - balance0P;
                let deltaU = balance1U - balance0U;
                let deltaSC = balance1SC - balance0SC;
                let deltaUC = balance1UC - balance0UC;

                expect(deltaS).to.be.eq(+outTokenS);
                expect(deltaP).to.be.eq(-inTokenPULP);
                assert.isAtMost(deltaU, +outTokenU + ROUNDING_ERR);
                expect(deltaSC).to.be.eq(-outTokenS);
                expect(deltaUC).to.be.eq(+0);

                truffleAssert.eventEmitted(withdraw, "Withdraw");
                console.log('[CACHE U]', fromWei(await _tokenU.balanceOf(tokenPULP)));
                console.log('[CACHE S]', fromWei(await WETH.methods.balanceOf(tokenPULP).call()));
                console.log('[BALANCE U]', fromWei(balance1U));
                console.log('[BALANCE S]', fromWei(balance1S));
                console.log('[BALANCE P]', fromWei(balance1P));
            });
        });

        describe('PrimePool.buy()', () => {
            it('reverts if inTokenS amount parameter is 0', async () => {
                await truffleAssert.reverts(
                    _pool.buy(
                        0,
                        tokenP,
                        {from: Alice, value: 0}
                    ),
                    "ERR_BAL_ETH"
                );
            });

            it('reverts if not enough tokenU', async () => {
                let inTokenS = ONE_ETHER;
                await truffleAssert.reverts(
                    _pool.buy(
                        inTokenS,
                        tokenP,
                        {from: Alice, value: inTokenS}),
                    "ERC20: transfer amount exceeds balance"
                );
            });

            it('purchases Prime option for a premium', async () => {
                await _tokenU.mint(Alice, MILLION_ETHER);
                await _pool.deposit(await _tokenP.base(), tokenP);

                let inTokenS = await _tokenP.price();
                let outTokenU = await _tokenP.base();
                let inTokenR = await _tokenP.price();
                let outTokenS = inTokenR;
                let outTokenP = await _tokenP.base();

                let balance0S = await getBalance(Alice);
                let balance0P = await _tokenP.balanceOf(Alice);

                let balance0U = await _tokenU.balanceOf(tokenPULP);
                let balance0R = await _tokenR.balanceOf(tokenPULP);

                let balance0UC = await _tokenU.balanceOf(tokenP);
                let balance0SC = await WETH.methods.balanceOf(tokenP).call();
                console.log('[TOKEN R BALANCE]', fromWei(await _tokenR.balanceOf(_pool.address)));
                console.log('[Utilized]', fromWei(await _pool.poolUtilized(tokenR, base, price)));
                console.log('[VOLATILITY]', (await _pool.calculateVolatilityProxy(tokenU, tokenR, base, price)).toString());
                let buy = await _pool.buy(inTokenS, tokenP, {from: Alice, value: inTokenS});
                console.log('[TOKEN R BALANCE]', fromWei(await _tokenR.balanceOf(_pool.address)));
                console.log('[Utilized]', fromWei(await _pool.poolUtilized(tokenR, base, price)));
                console.log('[VOLATILITY]', (await _pool.calculateVolatilityProxy(tokenU, tokenR, base, price)).toString());
                truffleAssert.prettyPrintEmittedEvents(buy);

                let balance1S = await getBalance(Alice);
                let balance1P = await _tokenP.balanceOf(Alice);

                let balance1U = await _tokenU.balanceOf(tokenPULP);
                let balance1R = await _tokenR.balanceOf(tokenPULP);

                let balance1UC = await _tokenU.balanceOf(tokenP);
                let balance1SC = await WETH.methods.balanceOf(tokenP).call();

                let deltaS = balance1S - balance0S;
                let deltaP = balance1P - balance0P;
                let deltaU = balance1U - balance0U;
                let deltaR = balance1R - balance0R;
                let deltaSC = balance1SC - balance0SC;
                let deltaUC = balance1UC - balance0UC;

                assert.isAtMost(deltaS, -inTokenS - 10^15);
                expect(deltaP).to.be.eq(+outTokenP);
                expect(deltaU).to.be.eq(-outTokenU); // this is the strike asset
                expect(deltaR).to.be.eq(+inTokenR);
                expect(deltaSC).to.be.eq(+0);
                expect(deltaUC).to.be.eq(+outTokenU);

                truffleAssert.eventEmitted(buy, "Buy");
            });
        });
        
        describe('PrimePool.withdraw()', () => {
            it('reverts if amount parameter is 0', async () => {
                await truffleAssert.reverts(
                    _pool.withdraw(
                        0,
                        tokenP,
                        {from: Alice}
                    ),
                    "ERR_BAL_PULP"
                );
            });

            it('reverts if user does not have enough tokenPULP', async () => {
                await truffleAssert.reverts(
                    _pool.withdraw(
                        MILLION_ETHER,
                        tokenP,
                        {from: Alice}
                    ),
                    "ERR_BAL_PULP"
                );
            });

            it('reverts if not enough redeemable strike', async () => {
                await truffleAssert.reverts(
                    _pool.withdraw(
                        ONE_ETHER,
                        tokenP,
                        {from: Alice}
                    ),
                    "ERR_BAL_STRIKE"
                );
            });

            it('should withdraw proportional amount of tokenU and tokenS', async () => {
                // tokenPULP in, tokenU and tokenS out, tokenR expended
                // tokenU out = tokenPULP * cacheU / total tokenPULP
                // tokenS out = tokenPULP * cacheS / total tokenPULP
                await trader.safeSwap(tokenP, await _tokenP.balanceOf(Alice), Alice, {from: Alice});
                let inTokenPULP = await _pool.balanceOf(Alice);
                let outTokenU = inTokenPULP*1 * await _tokenU.balanceOf(_pool.address) / await _pool.totalSupply();
                let outTokenS = inTokenPULP*1 * await _tokenR.balanceOf(_pool.address) / await _pool.totalSupply();
                let outTokenR = outTokenS; // FIX

                let balance0U = await _tokenU.balanceOf(Alice); 
                let balance0P = await _pool.balanceOf(Alice);
                let balance0S = await WETH.methods.balanceOf(Alice).call();

                let balance0UC = await _tokenU.balanceOf(tokenP);
                let balance0SC = await WETH.methods.balanceOf(tokenP).call();

                let withdraw = await _pool.withdraw((inTokenPULP).toString(), tokenP);
                truffleAssert.prettyPrintEmittedEvents(withdraw);

                let balance1U = await _tokenU.balanceOf(Alice);
                let balance1P = await _pool.balanceOf(Alice);
                let balance1S = await WETH.methods.balanceOf(Alice).call();

                let balance1UC = await _tokenU.balanceOf(tokenP);
                let balance1SC = await WETH.methods.balanceOf(tokenP).call();

                let deltaS = balance1S - balance0S;
                let deltaP = balance1P - balance0P;
                let deltaU = balance1U - balance0U;
                let deltaSC = balance1SC - balance0SC;
                let deltaUC = balance1UC - balance0UC;

                expect(deltaS).to.be.eq(+outTokenS);
                expect(deltaP).to.be.eq(-inTokenPULP);
                assert.isAtMost(deltaU, +outTokenU + ROUNDING_ERR);
                expect(deltaSC).to.be.eq(-outTokenS);
                expect(deltaUC).to.be.eq(+0);

                truffleAssert.eventEmitted(withdraw, "Withdraw");
            });
        });
    }); 
})