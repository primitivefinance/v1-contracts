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
const Usdc = artifacts.require("USDC");
const Dai = artifacts.require('DAI');
const Weth = require('../build/contracts/WETH9.json');

contract('PrimeERC20', accounts => {
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const { getBalance } = web3.eth;
    const ROUNDING_ERR = 10**5;
    const ERR_ZERO = "ERR_ZERO";
    const ERR_NOT_OWNER = "ERR_NOT_OWNER";
    const ERR_OPTION_TYPE = "ERR_OPTION_TYPE";
    const ERR_BAL_STRIKE = "ERR_BAL_STRIKE";
    const ERR_BAL_PRIME = "ERR_BAL_PRIME";
    const ERR_BAL_REDEEM = "ERR_BAL_REDEEM";
    const ERR_BAL_ETH = "ERR_BAL_ETH";
    const ERR_BAL_TOKENS = "ERR_BAL_TOKENS";
    const ERR_BAL_OPTIONS = "ERR_BAL_OPTIONS";
    const MAINNET_COMPOUND_ETH = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    const MAINNET_ORACLE = '0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9';
    const ONE_ETHER = toWei('0.1');
    const TWO_ETHER = toWei('0.2');
    const FIVE_ETHER = toWei('0.5');
    const TEN_ETHER = toWei('1');
    const FIFTY_ETHER = toWei('50');
    const MILLION_ETHER = toWei('1000000');


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
        ratio,
        expiry
        ;

    async function sendWeth(weth, to, from, amount) {
        await weth.methods.transfer(to, amount).send({from: from});
    }

    before(async () => {
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
        ratio = TEN_ETHER;

        // Create a new Eth Option Market
        firstMarket = 1;
        await _controllerMarket.createMarket(
            name,
            symbol,
            tokenU,
            tokenS,
            ratio,
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
    });

    describe('PrimeOption.sol', () => {
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
                (await _tokenP.ratio()).toString(),
                ratio,
                'Incorrect ratio'
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
                let balanceER = inTokenU*1 * ratio*1 / toWei('1');
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
                let differenceE = (inTokenU*1 * ratio*1 / toWei('1')).toString();
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
                await _tokenS.transfer(tokenP, ratio);
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

                let inTokenS = ratio;
                let inTokenP = ONE_ETHER;
                let outTokenU = ONE_ETHER;

                let balance0S = await _tokenS.balanceOf(Alice);
                let balance0P = await _tokenP.balanceOf(Alice);
                let balance0U = await _tokenU.methods.balanceOf(Alice).call();

                let balance0SC = await _tokenS.balanceOf(tokenP);
                let balance0UC = await _tokenU.methods.balanceOf(tokenP).call();

                await _tokenS.transfer(tokenP, inTokenS);
                await _tokenP.transfer(tokenP, inTokenP);
                console.log('[TOKEN U]', fromWei(await _tokenU.methods.balanceOf(tokenP).call()));
                console.log('[TOKEN P]', fromWei(await _tokenP.balanceOf(tokenP)));
                console.log('[TOKEN S]', fromWei(await _tokenS.balanceOf(tokenP)));
                await _tokenP.swap(Alice);

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

                expect(deltaS).to.be.eq(inTokens);
                expect(deltaP).to.be.eq(inTokenP);
                expect(deltaU).to.be.eq(outTokenU);
                expect(deltaSC).to.be.eq(-inTokenS);
                expect(deltaUC).to.be.eq(-outTokenU);
            });
        });

        
        describe('PrimeOption.redeem()', () => {
            beforeEach(async () => {

            });

            it('reverts if rPulp is less than qStrike', async () => {
                await truffleAssert.reverts(
                    _tokenP.withdraw(
                        MILLION_ETHER,
                        {from: Alice, value: 0}),
                    "ERR_BAL_REDEEM"
                );
            });

            it('withdraws strike assets', async () => {
                let iStrike = await _tokenS.balanceOf(Alice);
                let beforeStrike = ONE_ETHER * ratio / toWei('1');
                await _tokenP.withdraw((ONE_ETHER * ratio / toWei('1')).toString(), {from: Alice, value: 0});
                let erPulp = await _tokenR.balanceOf(Alice);
                let eStrike = await _tokenS.balanceOf(Alice);
                assert.equal((erPulp*1 - beforeStrike*1 - erPulp) <= ROUNDING_ERR, true, 'rPulp not equal');
                assert.equal((iStrike*1 + (ONE_ETHER * beforeStrike / toWei('1'))*1 - eStrike) <= ROUNDING_ERR, true, 'Strike not equal');
            });
        });

        
        describe('PrimeOption.close()', () => {
            beforeEach(async () => {

            });

            it('reverts if rPulp is less than ratio', async () => {
                await truffleAssert.reverts(
                    _tokenP.close(
                        MILLION_ETHER,
                        {from: Alice, value: 0}),
                    "ERR_BAL_REDEEM"
                );
            });


            it('closes position', async () => {
                let irPulp = await _tokenR.balanceOf(Alice);
                let ioPulp = await _tokenP.balanceOf(Alice);
                let iEth = await _tokenU.methods.balanceOf(Alice).call();
                let ratio = await _tokenP.ratio();
                let strikeBefore = ONE_ETHER*1 * ratio*1 / toWei('1');
                await _tokenP.close(ONE_ETHER, {from: Alice, value: 0});
                let erPulp = await _tokenR.balanceOf(Alice);
                let eoPulp = await _tokenP.balanceOf(Alice);
                let eEth = await _tokenU.methods.balanceOf(Alice).call();
                assert.equal((erPulp*1 - strikeBefore*1 - erPulp) <= ROUNDING_ERR, true, `expected redeem ${erPulp}, actual: ${erPulp*1 + strikeBefore*1 - erPulp}`);
                assert.equal((eoPulp*1 - ONE_ETHER*1 - eoPulp) <= ROUNDING_ERR, true, 'oPulp not equal');
                assert.equal((iEth*1 + ONE_ETHER*1 - eEth) <= ROUNDING_ERR, true, `expectedEth: ${eEth} actual: ${iEth*1 + ONE_ETHER*1 - eEth}`);
            });
        });
    }); 
})