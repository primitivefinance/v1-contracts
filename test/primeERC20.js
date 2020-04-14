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
        _exchange
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
            isEthCall,
            ethCallName
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

    describe('PrimeERC20.sol - Eth Call Option', () => {
        beforeEach(async () => {

        });

        it('should be a call option', async () => {
            let isCall = await _option.isEthCallOption();
            assert.strictEqual(isCall, true, 'Not Call but should be');
        });

        describe('deposit()', () => {

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

        describe('depositAndLimitSell()', () => {
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

        
        describe('swap()', () => {
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

        
        describe('withdraw()', () => {
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

        
        describe('close()', () => {
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
        });

        describe('Market Maker Pool deposit()', () => {

            it('opens pool position - gets mPulp', async () => {
                // FIX - NOT APART OF ERC20 TEST
                await _pool.deposit(oneEther, {from: userA, value: oneEther});
            });

        });
    });
})