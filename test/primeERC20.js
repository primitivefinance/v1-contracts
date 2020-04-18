const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const ControllerMarket = artifacts.require('ControllerMarket');
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const PrimeOption = artifacts.require('PrimeOption.sol');
const PrimeExchange = artifacts.require('PrimeExchange.sol');
const PrimePool = artifacts.require('PrimePool.sol');
const PrimeRedeem = artifacts.require('PrimeRedeem');

contract('PrimeERC20', accounts => {
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const { getBalance } = web3.eth;
    const ROUNDING_ERR = 10**16;
    const ERR_ZERO = "ERR_ZERO";
    const ERR_NOT_OWNER = "ERR_NOT_OWNER";
    const ERR_OPTION_TYPE = "ERR_OPTION_TYPE";
    const ERR_BAL_STRIKE = "ERR_BAL_STRIKE";
    const ERR_BAL_OPULP = "ERR_BAL_OPULP";
    const ERR_BAL_RPULP = "ERR_BAL_RPULP";
    const ERR_BAL_ETH = "ERR_BAL_ETH";
    const ERR_BAL_TOKENS = "ERR_BAL_TOKENS";
    const ERR_BAL_OPTIONS = "ERR_BAL_OPTIONS";
    const MAINNET_COMPOUND_ETH = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    const oneEther = toWei('0.1');
    const twoEther = toWei('0.2');
    const fiveEther = toWei('0.5');
    const tenEther = toWei('1');
    const millionEther = toWei('1000000');


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

    let _prime,
        userA,
        userB,
        _strike,
        _controllerMarket,
        qUnderlying,
        aUnderlying,
        qStrike,
        aStrike,
        tExpiry,
        isEthCall,
        ethCallName,
        _redeem,
        _pool,
        _option,
        _exchange,
        totalLiquidity,
        isTokenOption
        ;

    async function getGas(func, name) {
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    beforeEach(async () => {

        // Get the Option Parameters
        _strike = await tUSD.deployed();
        qUnderlying = oneEther;
        qStrike = tenEther;
        aStrike = _strike.address;
        tExpiry = '1587607322'
        isEthCall = true;
        ethCallName = 'ETH201212C150TUSD'
        

        // Get the Market Controller Contract
        _controllerMarket = await ControllerMarket.deployed();

        // Create a new Eth Option Market
        const firstMarket = 1;
        await _controllerMarket.createMarket(
            qUnderlying,
            qStrike,
            aStrike,
            tExpiry,
            ethCallName,
            isEthCall,
            isTokenOption,
        );
        
        // Get the market contracts
        _prime = await Prime.deployed();
        _redeem = await PrimeRedeem.at(await _controllerMarket._crRedeem());
        _pool = await PrimePool.at(await _controllerMarket.getMaker(firstMarket));
        _exchange = await PrimeExchange.at(await _controllerMarket.getExchange(firstMarket));
        _option = await PrimeOption.at(await _controllerMarket.getOption(firstMarket));

        userA = Alice;
        userB = Bob;
    });

    describe('Eth Call Option', () => {
        beforeEach(async () => {

        });

        it('should be a call option', async () => {
            let isCall = await _option.isEthCallOption();
            assert.strictEqual(isCall, true, 'Not Call but should be');
        });

        /* describe('PrimeOption.deposit()', () => {

            it('revert if msg.value = 0', async () => {
                await truffleAssert.reverts(
                    _option.deposit(
                        0,
                        {from: userA,  value: 0}
                    ),
                    "ERR_ZERO"
                );
            });
            

            it('mints rPulp and oPulp', async () => {
                let rPulp = qStrike;
                let oPulp = (oneEther).toString();
                await _option.deposit(oneEther, {from: userA, value: oneEther});
                let rPulpBal = (await _redeem.balanceOf(userA)).toString();
                let oPulpBal = (await _option.balanceOf(userA)).toString();
                assert.strictEqual(rPulpBal, rPulp, `${rPulpBal} != ${rPulp}`);
                assert.strictEqual(oPulpBal, oPulp, `${oPulpBal} != ${oPulp}`);
            });
        });

        describe('PrimeOption.depositAndLimitSell()', () => {
            beforeEach(async () => {

            });

            it('revert if msg.value = 0', async () => {
                await truffleAssert.reverts(
                    _option.depositAndLimitSell(
                        0,
                        0,
                        {from: userA,  value: 0}
                    ),
                    "ERR_ZERO"
                );
            });

            it('adds initial liquidity to exchange', async () => {
                await _option.deposit(twoEther, {from: userA, value: twoEther});
                let totalSupply = (await _exchange.totalSupply()).toString();
                assert.strictEqual(totalSupply, '0', 'Total supply not 0, initial liquidity already set');
                await _option.approve(_exchange.address, millionEther);
                await _exchange.addLiquidity(twoEther, twoEther, {from: userA, value: twoEther});
            });

            it('mints rPulp and oPulp', async () => {
                let etherBalUserStart = await web3.eth.getBalance(userA);
                let rPulp = qStrike;
                let oPulp = (oneEther).toString();
                let qInput = oPulp;
                let rInput = await _exchange.tokenReserves();
                let rOutput = await _exchange.etherReserves();
                let outputEth = await _exchange.getInputPrice(qInput, rInput, rOutput);
                let rPulpBalBefore = await _redeem.balanceOf(userA);
                let oPulpBalBefore = (await _option.balanceOf(userA)).toString();
                await _option.depositAndLimitSell(oneEther, (oneEther * 0.9).toString(), {from: userA, value: oneEther});
                let rPulpBal = (await _redeem.balanceOf(userA)).toString();
                let oPulpBal = (await _option.balanceOf(userA)).toString();
                let etherBalUserEnd = await web3.eth.getBalance(userA);
                
                assert.strictEqual(rPulpBal, (rPulpBalBefore*1 + tenEther*1).toString(), 'rPulp balances not equal');
                assert.strictEqual(oPulpBal, oPulpBalBefore, 'oPulp balances not equal');
                assert.strictEqual(
                    (etherBalUserStart*1 - oPulp*1 + outputEth*1 - etherBalUserEnd) <= ROUNDING_ERR,
                    true,
                    `ether balances not equal
                    Expected: ${etherBalUserEnd} actual: ${(etherBalUserStart*1 - oPulp*1 + outputEth*1 - etherBalUserEnd).toString()}
                    `
                );
            });
        });

        
        describe('PrimeOption.swap()', () => {
            beforeEach(async () => {

            });

            it('reverts if user doesnt have enough oPulp', async () => {
                await truffleAssert.reverts(
                    _option.swap(
                        millionEther,
                        {from: userA,  value: 0}
                    ),
                    "ERR_BAL_OPULP"
                );
            });

            it('reverts if user doesnt have enough strike assets', async () => {
                await _option.deposit(oneEther, {from: userB, value: oneEther});
                await truffleAssert.reverts(
                    _option.swap(
                        oneEther,
                        {from: userB,  value: 0}
                    ),
                    "ERR_BAL_STRIKE"
                );
            });

            it('swaps oPulp for underlying', async () => {
                await _option.deposit(oneEther, {from: userA, value: oneEther});
                let iEth = await getBalance(userA);
                let ioPulp = await _option.balanceOf(userA);
                let iStrike = await _strike.balanceOf(userA);
                await _strike.approve(_option.address, millionEther, {from: userA});
                await _option.swap(oneEther, {from: userA, value: 0});
                let eEth = await getBalance(userA);
                let eoPulp = await _option.balanceOf(userA);
                let eStrike = await _strike.balanceOf(userA);
                assert.strictEqual((iEth*1 + oneEther*1 - eEth) <= ROUNDING_ERR, true, `expectedEth: ${eEth}, actual: ${iEth*1 + oneEther*1}`);
                assert.strictEqual((eoPulp*1 - oneEther*1 - eoPulp) <= ROUNDING_ERR, true, `expectedoPulp: ${eoPulp}, actual: ${eoPulp*1 - oneEther*1}`);
                assert.strictEqual((eStrike*1 - qStrike*1 - eStrike) <= ROUNDING_ERR, true, `expectedeStrike: ${eStrike}, actual: ${eStrike*1 - qStrike*1}`);
            });
        });

        
        describe('PrimeOption.withdraw()', () => {
            beforeEach(async () => {

            });

            it('reverts if rPulp is less than qStrike', async () => {
                await truffleAssert.reverts(
                    _option.withdraw(
                        millionEther,
                        {from: userA, value: 0}),
                    "ERR_BAL_RPULP"
                );
            });

            it('reverts if prime contract doesnt have strike assets', async () => {
                await _option.deposit(twoEther, {from: userA, value: twoEther});
                await truffleAssert.reverts(
                    _option.withdraw(
                        (toWei('2')).toString(),
                        {from: userA, value: 0}),
                    "ERR_BAL_STRIKE"
                );
            });

            it('withdraws strike assets', async () => {
                let iStrike = await _strike.balanceOf(userA);
                let beforeStrike = oneEther * qStrike / toWei('1');
                await _option.withdraw((oneEther * qStrike / toWei('1')).toString(), {from: userA, value: 0});
                let erPulp = await _redeem.balanceOf(userA);
                let eStrike = await _strike.balanceOf(userA);
                assert.strictEqual((erPulp*1 - beforeStrike*1 - erPulp) <= ROUNDING_ERR, true, 'rPulp not equal');
                assert.strictEqual((iStrike*1 + (oneEther * beforeStrike / toWei('1'))*1 - eStrike) <= ROUNDING_ERR, true, 'Strike not equal');
            });
        });

        
        describe('PrimeOption.close()', () => {
            beforeEach(async () => {

            });

            it('reverts if rPulp is less than qStrike', async () => {
                await truffleAssert.reverts(
                    _option.close(
                        millionEther,
                        {from: userA, value: 0}),
                    "ERR_BAL_RPULP"
                );
            });

            it('reverts if user doesnt have enough oPulp', async () => {
                let oPulpBal = await _option.balanceOf(userB);
                await _option.transfer(userA, oPulpBal, {from: userB});
                await truffleAssert.reverts(
                    _option.close(
                        oneEther,
                        {from: userB,  value: 0}
                    ),
                    "ERR_BAL_OPULP"
                );
            });

            it('closes position', async () => {
                let irPulp = await _redeem.balanceOf(userA);
                let ioPulp = await _option.balanceOf(userA);
                let iEth = await getBalance(userA);
                let ratio = await _option.option();
                let strikeBefore = oneEther*1 * qStrike*1 / toWei('1');
                await _option.close(oneEther, {from: userA, value: 0});
                let erPulp = await _redeem.balanceOf(userA);
                let eoPulp = await _option.balanceOf(userA);
                let eEth = await getBalance(userA);
                assert.strictEqual((erPulp*1 - strikeBefore*1 - erPulp) <= ROUNDING_ERR, true, 'rPulp not equal');
                assert.strictEqual((eoPulp*1 - oneEther*1 - eoPulp) <= ROUNDING_ERR, true, 'oPulp not equal');
                assert.strictEqual((iEth*1 + oneEther*1 - eEth) <= ROUNDING_ERR, true, `expectedEth: ${eEth} actual: ${iEth*1 + oneEther*1 - eEth}`);
            });
        }); */

        describe('Exchange.addLiquidity()', () => {

            it('reverts if minQLiquidity is 0', async () => {
                await truffleAssert.reverts(
                    _exchange.addLiquidity(
                        0,
                        oneEther,
                        {from: userA, value: 0}
                    ),
                    ERR_ZERO
                );
            });

            it('reverts if maxQTokens is 0', async () => {
                await truffleAssert.reverts(
                    _exchange.addLiquidity(
                        oneEther,
                        0,
                        {from: userA, value: 0}
                    ),
                    ERR_ZERO
                );
            });

            it('reverts if initializing liquidity with 0 msg.value', async () => {
                await truffleAssert.reverts(
                    _exchange.addLiquidity(
                        oneEther,
                        oneEther,
                        {from: userA, value: 0}
                    ),
                    ERR_ZERO
                );
            });

            it('reverts if initializing liquidity without having tokens', async () => {
                await truffleAssert.fails(
                    _exchange.addLiquidity(
                        oneEther,
                        oneEther,
                        {from: userA, value: oneEther}
                    ),
                    truffleAssert.ErrorType.REVERT
                );
            });

            it('reverts if initializing liquidity with 0 msg.value', async () => {
                await truffleAssert.fails(
                    _exchange.addLiquidity(
                        oneEther,
                        oneEther,
                        {from: userA, value: 0}
                    ),
                    ERR_ZERO
                );
            });
            

            it('initializes liquidity', async () => {
                let addAmount = twoEther;
                await _option.deposit(twoEther, {from: userA, value: twoEther});
                await _option.approve(_exchange.address, millionEther, {from: userA});

                let balance = await _exchange.balanceOf(userA);
                
                let addLiquidity = await _exchange.addLiquidity(twoEther, twoEther, {from: userA, value: twoEther});
                await truffleAssert.eventEmitted(addLiquidity, 'AddLiquidity');

                let actual = await _exchange.balanceOf(userA);
                let expected = balance*1 + oneEther*1;
                totalLiquidity += oneEther;
                assert.strictEqual((expected - actual) <= ROUNDING_ERR, true, `${expected} != ${actual}`);
            });

            it('adds liquidity', async () => {
                await _option.deposit(oneEther, {from: userA, value: oneEther});
                await _option.approve(_exchange.address, millionEther, {from: userA});

                let balance = await _exchange.balanceOf(userA);
                let minQLiquidity = await _exchange.newLiquidity(oneEther);
                let maxQTokens = await _exchange.newTokens(oneEther);
                console.log(await fromWei(minQLiquidity), await fromWei(maxQTokens));
                let addLiquidity = await _exchange.addLiquidity(minQLiquidity, maxQTokens, {from: userA, value: oneEther});
                await truffleAssert.eventEmitted(addLiquidity, 'AddLiquidity');

                let actual = await _exchange.balanceOf(userA);
                let expected = balance*1 + oneEther*1;
                totalLiquidity + oneEther;
                assert.strictEqual((expected - actual) <= ROUNDING_ERR, true, `${expected} != ${actual}`);
            });

        });

        describe('Exchange.swapTokensToEth()', () => {

            it('reverts if qTokens is 0', async () => {
                await _option.deposit(twoEther, {from: userA, value: twoEther});
                await truffleAssert.reverts(
                    _exchange.swapTokensToEth(
                        0,
                        oneEther,
                        userA,
                        {from: userA, value: 0}
                    ),
                    ERR_BAL_ETH
                );
            });

            it('reverts if minQEth is 0', async () => {
                await truffleAssert.reverts(
                    _exchange.swapTokensToEth(
                        oneEther,
                        0,
                        userA,
                        {from: userA, value: 0}
                    ),
                    ERR_ZERO
                );
            });

            it('reverts if user doesnt have enough tokens in their balance', async () => {
                await truffleAssert.reverts(
                    _exchange.swapTokensToEth(
                        oneEther,
                        oneEther,
                        {from: userB, value: 0}
                    ),
                    ERR_BAL_OPTIONS
                );
            });

            it('reverts if minQEth is too high', async () => {
                await truffleAssert.reverts(
                    _exchange.swapTokensToEth(
                        oneEther,
                        tenEther,
                        {from: userA, value: oneEther}
                    ),
                    ERR_BAL_ETH
                );
            });

            it('swaps tokens to ether', async () => {
                let balance = await getBalance(userA);
                let qTokens = twoEther;
                let minQEth = oneEther;
                await _exchange.swapTokensToEth(qTokens, minQEth, userA, {from: userA, value: 0});
                let tokenReserves = await _exchange.tokenReserves();
                let etherReserves = await _exchange.etherReserves();
                let delta = await _exchange.getInputPrice(qTokens, tokenReserves, etherReserves);
                let actual = await getBalance(userA);
                let actualDelta = (actual*1 - balance*1 - delta*1);
                assert.strictEqual(actualDelta <= ROUNDING_ERR, true, `${actual} != ${actualDelta}`);
            });

        });

        describe('Exchange.swapEthToTokens()', () => {

            it('reverts if qTokens is 0', async () => {
                await truffleAssert.reverts(
                    _exchange.swapEthToTokens(
                        0,
                        {from: userA, value: oneEther}
                    ),
                    ERR_ZERO
                );
            });

            it('reverts if maxQEth (msg.value) is 0', async () => {
                await truffleAssert.reverts(
                    _exchange.swapEthToTokens(
                        oneEther,
                        {from: userA, value: 0}
                    ),
                    ERR_ZERO
                );
            });

            it('swaps ether to tokens', async () => {
                let balance = await _option.balanceOf(userA);
                let qTokens = oneEther;
                let maxQEth = twoEther;
                await _exchange.swapEthToTokens(qTokens, {from: userA, value: maxQEth});
                let tokenReserves = await _exchange.tokenReserves();
                let etherReserves = await _exchange.etherReserves();
                etherReserves = etherReserves*1 - maxQEth*1;
                let delta = await _exchange.getOutputPrice(qTokens, etherReserves, tokenReserves);
                let actual = await _option.balanceOf(userA);
                let actualDelta = (actual*1 - balance*1 - delta*1);
                assert.strictEqual(actualDelta <= ROUNDING_ERR, true, `${actual} != ${actualDelta}`);
            });
        });

        describe('Exchange.removeLiquidity()', () => {

            it('reverts if qLiquidity is 0', async () => {
                await truffleAssert.reverts(
                    _exchange.removeLiquidity(
                        0,
                        oneEther,
                        oneEther,
                        {from: userA, value: 0}
                    ),
                    ERR_ZERO
                );
            });

            it('reverts if minQEth is 0', async () => {
                await truffleAssert.reverts(
                    _exchange.removeLiquidity(
                        oneEther,
                        0,
                        oneEther,
                        {from: userA, value: 0}
                    ),
                    ERR_ZERO
                );
            });

            it('reverts if minQTokens is 0', async () => {
                await truffleAssert.reverts(
                    _exchange.removeLiquidity(
                        oneEther,
                        oneEther,
                        0,
                        {from: userA, value: 0}
                    ),
                    ERR_ZERO
                );
            });

            it('removes liquidity', async () => {
                let balanceOption = await _option.balanceOf(userA);
                let balanceLiquidity = await _exchange.balanceOf(userA);
                let balanceEther = await getBalance(userA);

                let qLiquidity = oneEther;
                let minQEth = await _exchange.ethLiquidity(oneEther);
                let minQTokens = await _exchange.tokenLiquidity(oneEther);
                await _exchange.removeLiquidity(qLiquidity, minQEth, minQTokens, {from: userA, value: 0});

                let deltaBalanceOption = minQTokens;
                let deltaBalanceLiquidity = qLiquidity;
                let deltaBalanceEther = minQEth;

                let actualBalanceOption = await _option.balanceOf(userA);
                let actualBalanceLiquidity = await _exchange.balanceOf(userA);
                let actualBalanceEther = await getBalance(userA);

                let actualDeltaBalanceOption = (actualBalanceOption*1 - deltaBalanceOption*1 - balanceOption*1);
                let actualDeltaBalanceLiquidity = (actualBalanceLiquidity*1 - deltaBalanceLiquidity*1 - balanceLiquidity*1);
                let actualDeltaBalanceEther = (actualBalanceEther*1 - deltaBalanceEther*1 - balanceEther*1);
                assert.strictEqual(actualDeltaBalanceOption <= ROUNDING_ERR, true, `${actualBalanceOption} != ${actualDeltaBalanceOption}`);
                assert.strictEqual(actualDeltaBalanceLiquidity <= ROUNDING_ERR, true, `${actualBalanceLiquidity} != ${actualDeltaBalanceLiquidity}`);
                assert.strictEqual(actualDeltaBalanceEther <= ROUNDING_ERR, true, `${actualBalanceEther} != ${actualDeltaBalanceEther}`);
            });
        });
    });
})