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

contract('PrimePool.sol', accounts => {
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

        _tokenS = WETH;
        _tokenU = await Dai.deployed();

        name = 'ETH Put 200 DAI Expiring May 30 2020';
        symbol = 'PRIME';
        tokenU = _tokenU.address; // USDC
        tokenS = WETH._address; // WETH
        expiry = '1590868800';
        base = toWei('200');
        price = toWei('1');

        // Create a new Eth Option Market
        firstMarket = 1;

        _pool = await PrimePool.deployed();
        _tokenP = await PrimeOption.deployed();
        _tokenR = await PrimeRedeem.deployed();
        tokenP = _tokenP.address;
        tokenR = _tokenR.address;
        tokenPULP = _pool.address;
        _tokenPULP = _pool;

        await _tokenU.mint(Alice, MILLION_ETHER);
        await WETH.methods.deposit().send({from: Alice, value: toWei('25')});
        await WETH.methods.deposit().send({from: Bob, value: toWei('25')});

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

    describe('PrimePool.sol', () => {
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
                assert.isAtMost(deltaU, -inTokenU-10^10);
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

        /* describe('PrimePool.kill()', () => {
            it('reverts if trying to pause as not owner', async () => {
                await truffleAssert.reverts(
                    _pool.kill(
                        {from: Bob}
                    ),
                    "Ownable: caller is not the owner"
                );
            });


            it('should withdraw proportional amount of tokenU and tokenS when paused', async () => {
                let inTokenS = await _tokenP.price();
                // Deposit some funds
                await _pool.deposit(await _tokenP.base(), tokenP);
                // Buy the options
                await _pool.buy(inTokenS, tokenP, {from: Alice, value: inTokenS});
                // Pause the pool
                await _pool.kill();
                // Swap the options
                await trader.safeSwap(tokenP, await _tokenP.balanceOf(Alice), Alice, {from: Alice});
                // attempt to withdraw

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

            it('reverts if trying to call deposit when paused', async () => {
                await truffleAssert.reverts(
                    _pool.deposit(
                        10,
                        tokenP,
                        {from: Alice}
                    ),
                    "Pausable: paused"
                );
            });

            it('reverts if trying to call buy when paused', async () => {
                await truffleAssert.reverts(
                    _pool.buy(
                        10,
                        tokenP,
                        {from: Alice}
                    ),
                    "Pausable: paused"
                );
            });
        }); */
    }); 
})