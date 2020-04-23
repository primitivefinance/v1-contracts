const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const ControllerMarket = artifacts.require('ControllerMarket');
const PrimeOption = artifacts.require('PrimeOption.sol');
const PrimePool = artifacts.require('PrimePool.sol');
const PrimeRedeem = artifacts.require('PrimeRedeem');
const Usdc = artifacts.require("USDC");

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
        _strike = await Usdc.deployed();
        qUnderlying = oneEther;
        qStrike = tenEther;
        aStrike = _strike.address;
        tExpiry = '1607774400'
        isEthCall = true;
        ethCallName = 'ETH201212C150USDC'
        isTokenOption = false;

        // Get the Market Controller Contract
        _controllerMarket = await ControllerMarket.deployed();

        // Create a new Eth Option Market
        const firstMarket = 1;
        await _controllerMarket.createMarket(
            qUnderlying,
            aStrike,
            qStrike,
            aStrike,
            tExpiry,
            ethCallName,
            isEthCall,
            isTokenOption,
        );
        
        
        _pool = await PrimePool.at(await _controllerMarket.getMaker(firstMarket));
        _option = await PrimeOption.at(await _controllerMarket.getOption(firstMarket));
        _redeem = await PrimeRedeem.at(await _option._rPulp());

        userA = Alice;
        userB = Bob;
    });

    describe('PrimeOption.sol', () => {
        beforeEach(async () => {

        });

        it('should be a call option', async () => {
            let isCall = await _option.isEthCallOption();
            assert.strictEqual(isCall, true, 'Not Call but should be');
        });

        describe('PrimeOption.deposit()', () => {

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
                let rPulp = toWei('10');
                let oPulp = (tenEther).toString();
                await _option.deposit(tenEther, {from: userA, value: tenEther});
                let rPulpBal = (await _redeem.balanceOf(userA)).toString();
                let oPulpBal = (await _option.balanceOf(userA)).toString();
                assert.strictEqual(rPulpBal, rPulp, `${rPulpBal} != ${rPulp}`);
                assert.strictEqual(oPulpBal, oPulp, `${oPulpBal} != ${oPulp}`);
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
        });
    });

    /* describe('PrimePool.sol', () => {
        beforeEach(async () => {

        });

        describe('PrimePool.deposit()', () => {

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
                let rPulp = toWei('10');
                let oPulp = (tenEther).toString();
                await _option.deposit(tenEther, {from: userA, value: tenEther});
                let rPulpBal = (await _redeem.balanceOf(userA)).toString();
                let oPulpBal = (await _option.balanceOf(userA)).toString();
                assert.strictEqual(rPulpBal, rPulp, `${rPulpBal} != ${rPulp}`);
                assert.strictEqual(oPulpBal, oPulp, `${oPulpBal} != ${oPulp}`);
            });
        });

        
        describe('PrimePool.swap()', () => {
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

        
        describe('PrimePool.withdraw()', () => {
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

        
        describe('PrimePool.close()', () => {
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
    }); */
})