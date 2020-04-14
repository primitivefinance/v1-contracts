const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const Options = artifacts.require('Options');
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const PrimeERC20 = artifacts.require('PrimeERC20.sol');
const ExchangeERC20 = artifacts.require('ExchangeERC20.sol');
const PoolERC20 = artifacts.require('PoolERC20.sol');
const RPulp = artifacts.require('RPulp');

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
        _tETH,
        _tUSD,
        collateral,
        payment,
        xis,
        yak,
        zed,
        wax,
        pow,
        gem,
        mint,
        exercise,
        close,
        withdraw,
        _burnId,
        _collateralID,
        _exchange,
        primeAddress,
        expiration,
        collateralPoolAddress,
        strikeAddress,
        premium,
        value,
        activeTokenId,
        nonce,
        oneEther,
        twoEther,
        fiveEther,
        tenEther,
        userA,
        userB,
        prime20Address,
        rPulp,
        _rPulp,
        millionEther,
        _strike,
        strikeAmount
        ;

    async function getGas(func, name) {
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    beforeEach(async () => {
        // get values that wont change
        _pool20 = await PoolERC20.deployed();
        _prime = await Prime.deployed();
        _tUSD = await tUSD.deployed();
        _strike = _tUSD;
        _rPulp = await RPulp.deployed();
        strike = _tUSD.address;
        oneEther = await toWei('0.1');
        twoEther = await toWei('0.2');
        fiveEther = await toWei('0.5');
        tenEther = await toWei('1');
        strikeAmount = tenEther;
        millionEther = await toWei('1000000');
        expiry = '1587607322';
        userA = Alice;
        userB = Bob;
    });

    describe('PrimeERC20.sol - Eth Call Option', () => {
        beforeEach(async () => {
            options = await Options.deployed();
            nonce = await options._nonce();
            prime20Address = await options._primeMarkets(nonce);
            _prime20 = await PrimeERC20.at(prime20Address);
            _exchange20 = await ExchangeERC20.deployed();
            collateral = prime20Address;
        });

        it('should be a call option', async () => {
            let isCall = await _prime20.isEthCallOption();
            console.log({isCall});
        });

        describe('deposit()', () => {

            it('revert if msg.value = 0', async () => {
                await truffleAssert.reverts(
                    _prime20.deposit(
                        0,
                        {from: userA,  value: 0}
                    ),
                    "ERR_ZERO"
                );
            });
            

            it('mints rPulp and oPulp', async () => {
                let rPulp = strikeAmount;
                let oPulp = (oneEther).toString();
                await _prime20.deposit(oneEther, {from: userA, value: oneEther});
                let rPulpBal = (await _rPulp.balanceOf(userA)).toString();
                let oPulpBal = (await _prime20.balanceOf(userA)).toString();
                assert.strictEqual(rPulpBal, rPulp, 'rPulp balances not equal');
                assert.strictEqual(oPulpBal, oPulp, 'oPulp balances not equal');
            });
        });

        describe('depositAndLimitSell()', () => {
            beforeEach(async () => {
                options = await Options.deployed();
                nonce = await options._nonce();
                prime20Address = await options._primeMarkets(nonce);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchange20 = await ExchangeERC20.deployed();
                collateral = prime20Address;
            });

            it('revert if msg.value = 0', async () => {
                await truffleAssert.reverts(
                    _prime20.depositAndLimitSell(
                        0,
                        0,
                        {from: userA,  value: 0}
                    ),
                    "ERR_ZERO"
                );
            });

            it('adds initial liquidity to exchange', async () => {
                await _prime20.deposit(twoEther, {from: userA, value: twoEther});
                let totalSupply = (await _exchange20.totalSupply()).toString();
                assert.strictEqual(totalSupply, '0', 'Total supply not 0, initial liquidity already set');
                await _prime20.approve(_exchange20.address, millionEther);
                await _exchange20.addLiquidity(twoEther, twoEther, {from: userA, value: twoEther});
            });

            it('mints rPulp and oPulp', async () => {
                let etherBalUserStart = await web3.eth.getBalance(userA);
                let rPulp = strikeAmount;
                let oPulp = (oneEther).toString();
                let qInput = oPulp;
                let rInput = await _exchange20.tokenReserves();
                let rOutput = await _exchange20.etherReserves();
                let outputEth = await _exchange20.getInputPrice(qInput, rInput, rOutput);
                let rPulpBalBefore = await _rPulp.balanceOf(userA);
                let oPulpBalBefore = (await _prime20.balanceOf(userA)).toString();
                await _prime20.depositAndLimitSell(oneEther, (oneEther * 0.9).toString(), {from: userA, value: oneEther});
                let rPulpBal = (await _rPulp.balanceOf(userA)).toString();
                let oPulpBal = (await _prime20.balanceOf(userA)).toString();
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
                options = await Options.deployed();
                nonce = await options._nonce();
                prime20Address = await options._primeMarkets(nonce);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchange20 = await ExchangeERC20.deployed();
                collateral = prime20Address;
            });

            it('reverts if user doesnt have enough oPulp', async () => {
                await truffleAssert.reverts(
                    _prime20.swap(
                        millionEther,
                        {from: userA,  value: 0}
                    ),
                    "ERR_BAL_OPULP"
                );
            });

            it('reverts if user doesnt have enough strike assets', async () => {
                await _prime20.deposit(oneEther, {from: userB, value: oneEther});
                await truffleAssert.reverts(
                    _prime20.swap(
                        oneEther,
                        {from: userB,  value: 0}
                    ),
                    "ERR_BAL_STRIKE"
                );
            });

            it('swaps oPulp for underlying', async () => {
                await _prime20.deposit(oneEther, {from: userA, value: oneEther});
                let iEth = await getBalance(userA);
                let ioPulp = await _prime20.balanceOf(userA);
                let iStrike = await _strike.balanceOf(userA);
                await _strike.approve(_prime20.address, millionEther, {from: userA});
                await _prime20.swap(oneEther, {from: userA, value: 0});
                let eEth = await getBalance(userA);
                let eoPulp = await _prime20.balanceOf(userA);
                let eStrike = await _strike.balanceOf(userA);
                assert.strictEqual((iEth*1 + oneEther*1 - eEth) <= ROUNDING_ERR, true, `expectedEth: ${eEth}, actual: ${iEth*1 + oneEther*1}`);
                assert.strictEqual((eoPulp*1 - oneEther*1 - eoPulp) <= ROUNDING_ERR, true, `expectedoPulp: ${eoPulp}, actual: ${eoPulp*1 - oneEther*1}`);
                assert.strictEqual((eStrike*1 - strikeAmount*1 - eStrike) <= ROUNDING_ERR, true, `expectedeStrike: ${eStrike}, actual: ${eStrike*1 - strikeAmount*1}`);
            });
        });

        
        describe('withdraw()', () => {
            beforeEach(async () => {
                options = await Options.deployed();
                nonce = await options._nonce();
                prime20Address = await options._primeMarkets(nonce);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchange20 = await ExchangeERC20.deployed();
                collateral = prime20Address;
            });

            it('reverts if rPulp is less than qStrike', async () => {
                let irPulp = await _rPulp.balanceOf(userA);
                console.log((await _prime20.option()).qStrike);
                let ratio = await _prime20.option();
                let qStrike = oneEther * ratio / toWei('1');
                await truffleAssert.reverts(
                    _prime20.withdraw(
                        millionEther,
                        {from: userA, value: 0}),
                    "ERR_BAL_RPULP"
                );
            });

            it('reverts if prime contract doesnt have strike assets', async () => {
                await _prime20.deposit(twoEther, {from: userA, value: twoEther});
                let irPulp = await _rPulp.balanceOf(userA);
                console.log((await fromWei(await _strike.balanceOf(_prime20.address))));
                let ratio = await _prime20.option();
                let qStrike = oneEther * ratio / toWei('1');
                await truffleAssert.reverts(
                    _prime20.withdraw(
                        (toWei('2')).toString(),
                        {from: userA, value: 0}),
                    "ERR_BAL_STRIKE"
                );
            });

            it('withdraws strike assets', async () => {
                let irPulp = await _rPulp.balanceOf(userA);
                let iStrike = await _strike.balanceOf(userA);
                let ratio = await _prime20.option();
                let qStrike = oneEther * strikeAmount / toWei('1');
                await _prime20.withdraw((oneEther * strikeAmount / toWei('1')).toString(), {from: userA, value: 0});
                let erPulp = await _rPulp.balanceOf(userA);
                let eStrike = await _strike.balanceOf(userA);
                assert.strictEqual((erPulp*1 - qStrike*1 - erPulp) <= ROUNDING_ERR, true, 'rPulp not equal');
                assert.strictEqual((iStrike*1 + (oneEther * strikeAmount / toWei('1'))*1 - eStrike) <= ROUNDING_ERR, true, 'Strike not equal');
            });
        });

        
        describe('close()', () => {
            beforeEach(async () => {
                options = await Options.deployed();
                nonce = await options._nonce();
                prime20Address = await options._primeMarkets(nonce);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchange20 = await ExchangeERC20.deployed();
                collateral = prime20Address;
            });

            it('reverts if rPulp is less than qStrike', async () => {
                let irPulp = await _rPulp.balanceOf(userA);
                let ratio = await _prime20.option();
                let qStrike = oneEther * ratio / toWei('1');
                await truffleAssert.reverts(
                    _prime20.close(
                        millionEther,
                        {from: userA, value: 0}),
                    "ERR_BAL_RPULP"
                );
            });

            it('reverts if user doesnt have enough oPulp', async () => {
                let oPulpBal = await _prime20.balanceOf(userB);
                await _prime20.transfer(userA, oPulpBal, {from: userB});
                await truffleAssert.reverts(
                    _prime20.close(
                        oneEther,
                        {from: userB,  value: 0}
                    ),
                    "ERR_BAL_OPULP"
                );
            });

            it('closes position', async () => {
                let irPulp = await _rPulp.balanceOf(userA);
                let ioPulp = await _prime20.balanceOf(userA);
                let iEth = await getBalance(userA);
                let ratio = await _prime20.option();
                let qStrike = oneEther*1 * strikeAmount*1 / toWei('1');
                await _prime20.close(oneEther, {from: userA, value: 0});
                let erPulp = await _rPulp.balanceOf(userA);
                let eoPulp = await _prime20.balanceOf(userA);
                let eEth = await getBalance(userA);
                assert.strictEqual((erPulp*1 - qStrike*1 - erPulp) <= ROUNDING_ERR, true, 'rPulp not equal');
                assert.strictEqual((eoPulp*1 - oneEther*1 - eoPulp) <= ROUNDING_ERR, true, 'oPulp not equal');
                assert.strictEqual((iEth*1 + oneEther*1 - eEth) <= ROUNDING_ERR, true, `expectedEth: ${eEth} actual: ${iEth*1 + oneEther*1 - eEth}`);
            });

            it('opens pool position - gets mPulp', async () => {
                // FIX - NOT APART OF ERC20 TEST
                await _pool20.deposit(oneEther, {from: userA, value: oneEther});
            });
        });
    });
})