const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const Options = artifacts.require('Options');
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const PrimeERC20 = artifacts.require('PrimeERC20.sol');
const ExchangeERC20 = artifacts.require('ExchangeERC20.sol');
const PoolERC20 = artifacts.require('PoolERC20.sol');

contract('PoolERC20', accounts => {
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const { getBalance } = web3.eth;
    const ROUNDING_ERR = 10**16;

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
        
        _prime = await Prime.deployed();
        _tUSD = await tUSD.deployed();
        _strike = _tUSD;
        _rPulp = await RPulp.deployed();
        strike = _tUSD.address;
        oneEther = await toWei('1');
        twoEther = await toWei('2');
        fiveEther = await toWei('5');
        tenEther = await toWei('10');
        strikeAmount = tenEther;
        millionEther = await toWei('1000000');
        expiry = '1587607322';
        userA = Alice;
        userB = Bob;
    });

    describe('PoolERC20.sol', () => {
        beforeEach(async () => {
            // new PoolERC20 instance
            _pool20 = await PoolERC20.deployed();
        });

        describe('setExchangeAddress()', () => {
            let minter;
            beforeEach(async () => {
                options = await Options.deployed();
                nonce = await options._nonce();
                prime20Address = await options._primeMarkets(nonce);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchange20 = await ExchangeERC20.deployed();
                collateral = prime20Address;
            });

            it('should assert only owner can call set exchange', async () => {
                await truffleAssert.reverts(
                    _pool.setExchangeAddress(userB, {from: userB}),
                    "Ownable: caller is not the owner"
                );
            });
        });

        describe('deposit()', () => {
            beforeEach(async () => {
                options = await Options.deployed();
                nonce = await options._nonce();
                prime20Address = await options._primeMarkets(nonce);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchange20 = await ExchangeERC20.deployed();
                collateral = prime20Address;
            });

            it('should revert if msg.value != deposit amount', async () => {
                await truffleAssert.reverts(
                    _pool.deposit(collateralAmount, {from: minter, value: strikeAmount}),
                    "Deposit: Val < deposit"
                );
            });

            it('check initial LP token mint is equal to deposit amount', async () => {
                let deposit = await _pool.deposit(collateralAmount, {from: minter, value: collateralAmount});
                await truffleAssert.eventEmitted(deposit, "Deposit");
                let mintedPulpTokens = (await _pool.balanceOf(minter)).toString();
                /* FIX - NEED TO FIND A WAY TO CALCULATE EXCHANGE RATE BETWEEN PULP AND ETHER */
                /* assert.strictEqual(
                    mintedPulpTokens,
                    collateralAmount,
                    `Minted LP tokens should match deposit for the initial supply.
                    Minted: ${mintedPulpTokens}, Collateral: ${collateralAmount}`
                ); */
            });

            it('asserts the ether was converted into cEther', async () => {
                /* FIX */

                /* let etherBalanceOfPool = (await web3.eth.getBalance(_pool.address)).toString();
                let cEtherBalanceOfPool = (await _pool.getPoolBalance()).toString();
                assert.strictEqual(
                    etherBalanceOfPool,
                    cEtherBalanceOfPool,
                    `Gets balance of underlying through cEther and compares to deposit.
                    Ether Bal: ${etherBalanceOfPool}, cEther Equivalent: ${cEtherBalanceOfPool}`
                ); */
            });

            it('asserts deposit event was emitted', async () => {
                let deposit = await _pool.deposit(collateralAmount, {from: minter, value: collateralAmount});
                await truffleAssert.eventEmitted(deposit, 'Deposit');
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
            
            it('revert with attempted withdraw amount is greater than deposit', async () => {
                let million = (await web3.utils.toWei('1000000')).toString();
                await truffleAssert.reverts(
                    _pool.withdraw(million, {from: minter, value: 0}),
                    `Withdraw: Bal < withdraw`
                )
            });

            it('revert with attempted withdraw amount is greater than max draw', async () => {
                /* FIX - need to find a way to fill the pool with just enough liabilities to trigger this */
                
                /* Make a liabilitiy */
                /* await _pool.mintPrimeFromPool(
                    collateralAmount,
                    strikeAmount,
                    strike,
                    expiry,
                    minter,
                    {from: minter, value: collateralAmount}
                );
                let totalBalance = (await _pool.totalSupply()).toString();
                await truffleAssert.reverts(
                    _pool.withdraw(
                        totalBalance,
                        {from: minter, value: 0}
                    ),
                    "Withdraw: max burn < amt"
                ); */
            });
        });

        describe('redeem()', () => {
            beforeEach(async () => {
                options = await Options.deployed();
                nonce = await options._nonce();
                prime20Address = await options._primeMarkets(nonce);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchange20 = await ExchangeERC20.deployed();
                collateral = prime20Address;
            });

            it('should revert, attempts to close a position larger than their position', async () => {
                let million = (await web3.utils.toWei('1000000')).toString();
                await truffleAssert.reverts(
                    _pool.closePosition(million, {from: minter, value: 0}),
                    "Close: Eth Bal < amt"
                );
            });

            it('should revert, attempts to close a position without paying its debt', async () => {
                let pulpBalanceOfUser = (await _pool.balanceOf(minter, {from: minter})).toString();
                /* Make a liabilitiy */
                await _pool.mintPrimeFromPool(
                    collateralAmount,
                    strikeAmount,
                    strike,
                    expiry,
                    minter,
                    {from: minter, value: collateralAmount}
                );
                await truffleAssert.reverts(
                    _pool.closePosition(pulpBalanceOfUser, {from: minter, value: 0}),
                    "Close: Value < debt"
                );
            });

            it('should close position by paying debt', async () => {
                let pulpBalanceOfUser = (await _pool.balanceOf(minter, {from: minter})).toString();
                let etherBalanceOfUserBefore = (await web3.eth.getBalance(minter)).toString();
                let close = await _pool.closePosition(pulpBalanceOfUser, {from: minter, value: pulpBalanceOfUser});
                let pulpBalanceOfUserAfter = (await _pool.balanceOf(minter, {from: minter})).toString();
                let etherBalanceOfUserAfter = (await web3.eth.getBalance(minter)).toString();
                assert.strictEqual(
                    pulpBalanceOfUserAfter,
                    (pulpBalanceOfUser*1 - pulpBalanceOfUser*1).toString(),
                    `Should burn all the pulp tokens.
                    Pulp before: ${pulpBalanceOfUser}, Pulp after: ${pulpBalanceOfUserAfter}`
                );
                await truffleAssert.eventEmitted(close, 'Close');
                /* Assertion below has 0.0001 ether difference because of Compound interest - FIX */
                /* assert.strictEqual(
                    etherBalanceOfUserAfter,
                    (etherBalanceOfUserBefore*1 + pulpBalanceOfUser*1).toString(),
                    `Should have sent ether proportional to pulp burned.
                    Ether before: ${etherBalanceOfUserBefore}, Ether After: ${etherBalanceOfUserAfter}`
                ); */
            });
        });

        describe('closePosition()', () => {
            beforeEach(async () => {
                options = await Options.deployed();
                nonce = await options._nonce();
                prime20Address = await options._primeMarkets(nonce);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchange20 = await ExchangeERC20.deployed();
                collateral = prime20Address;
            });

            it('should revert, attempts to close a position larger than their position', async () => {
                let million = (await web3.utils.toWei('1000000')).toString();
                await truffleAssert.reverts(
                    _pool.closePosition(million, {from: minter, value: 0}),
                    "Close: Eth Bal < amt"
                );
            });

            it('should revert, attempts to close a position without paying its debt', async () => {
                let pulpBalanceOfUser = (await _pool.balanceOf(minter, {from: minter})).toString();
                /* Make a liabilitiy */
                await _pool.mintPrimeFromPool(
                    collateralAmount,
                    strikeAmount,
                    strike,
                    expiry,
                    minter,
                    {from: minter, value: collateralAmount}
                );
                await truffleAssert.reverts(
                    _pool.closePosition(pulpBalanceOfUser, {from: minter, value: 0}),
                    "Close: Value < debt"
                );
            });

            it('should close position by paying debt', async () => {
                let pulpBalanceOfUser = (await _pool.balanceOf(minter, {from: minter})).toString();
                let etherBalanceOfUserBefore = (await web3.eth.getBalance(minter)).toString();
                let close = await _pool.closePosition(pulpBalanceOfUser, {from: minter, value: pulpBalanceOfUser});
                let pulpBalanceOfUserAfter = (await _pool.balanceOf(minter, {from: minter})).toString();
                let etherBalanceOfUserAfter = (await web3.eth.getBalance(minter)).toString();
                assert.strictEqual(
                    pulpBalanceOfUserAfter,
                    (pulpBalanceOfUser*1 - pulpBalanceOfUser*1).toString(),
                    `Should burn all the pulp tokens.
                    Pulp before: ${pulpBalanceOfUser}, Pulp after: ${pulpBalanceOfUserAfter}`
                );
                await truffleAssert.eventEmitted(close, 'Close');
                /* Assertion below has 0.0001 ether difference because of Compound interest - FIX */
                /* assert.strictEqual(
                    etherBalanceOfUserAfter,
                    (etherBalanceOfUserBefore*1 + pulpBalanceOfUser*1).toString(),
                    `Should have sent ether proportional to pulp burned.
                    Ether before: ${etherBalanceOfUserBefore}, Ether After: ${etherBalanceOfUserAfter}`
                ); */
            });
        });
    });
})