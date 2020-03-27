const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const tETH = artifacts.require("tETH");
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const Exchange = artifacts.require('Exchange');
const Pool = artifacts.require('Pool');

contract('Pool', accounts => {

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

    // Accounts Array
    const acc_ray = [
        ['Alice', Alice],
        ['Bob', Bob],
        ['Mary', Mary],
        ['Kiln', Kiln],
        ['Don', Don],
        ['Penny', Penny],
        ['Cat', Cat],
        ['Bjork', Bjork],
        ['Olga', Olga],
        ['Treasury', Treasury]
    ]

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
        nonce
        ;

    async function getGas(func, name) {
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    async function getBal(contract, address, name, units) {
        let bal = (await web3.utils.fromWei((await contract.balanceOf(address)).toString()));
        console.log(`${name} has in bank:`, await web3.utils.fromWei(await _prime.getBalance(Alice, contract.address)))
        console.log(`${name} has a balance of ${bal} ${units}.`);
    }

    async function getEthBal(address, name, units) {
        let bal = await web3.utils.fromWei((await web3.eth.getBalance(address)).toString());
        console.log(`${name} has a balance of ${bal} ${units}.`);
    }

    async function getPoolBalances(poolInstance) {
        let pool = await web3.utils.fromWei(await poolInstance._pool());
        let liability = await web3.utils.fromWei(await poolInstance._liability());
        let lp1Funds = await web3.utils.fromWei(await poolInstance._collateral(Alice));
        let lp2Funds = await web3.utils.fromWei(await poolInstance._collateral(Bob));
        let etherBal =  await web3.utils.fromWei((await web3.eth.getBalance(poolInstance.address)).toString());
        let revenue = await web3.utils.fromWei(await poolInstance._revenue());
        let totalDeposit = await web3.utils.fromWei(await poolInstance._totalDeposit());
        console.log({pool, liability, lp1Funds, lp2Funds, etherBal, revenue, totalDeposit})
        return ({pool, liability, lp1Funds, lp2Funds, etherBal, revenue, totalDeposit});
    }

    beforeEach(async () => {

        _prime = await Prime.deployed();
        _tUSD = await tUSD.deployed();
        _tETH = await tETH.deployed();
        _exchange = await Exchange.deployed();
        _pool = await Pool.deployed();
        collateral = await web3.utils.toWei('1');
        payment = await web3.utils.toWei('10');
        collateralPoolAddress = _pool.address;
        strikeAddress = _tUSD.address;
        primeAddress = await _exchange.getPrimeAddress();
        expiration = '1587607322';
        premium = (13*10**16).toString();
        
        
        
        await _tETH.approve(_prime.address, payment);
        await _tUSD.approve(_prime.address, payment);
        await _tETH.approve(_prime.address, payment, {from: Bob});
        await _tUSD.approve(_prime.address, payment, {from: Bob});
        
        await _tETH.mint(Alice, payment);
        await _tUSD.mint(Alice, payment);
        await _tETH.mint(Bob, payment);
        await _tUSD.mint(Bob, payment);

        /* await _prime.setPoolAddress(_pool.address); */
        let _LP = Alice;
        value = await web3.utils.toWei('1');
        let deposit = await _pool.deposit(value, {from: _LP, value: value});
        
        await getPoolBalances(_pool);


    });
    

    it('should be able to withdraw funds', async () => {
        nonce = 0;
        /* +1 */
        let withdraw = await _pool.withdrawLpFunds(value, Alice);
        /* -1 */
        await getPoolBalances(_pool);
        /* = 1 */
    });

    it('can Mint Prime from Pool', async () => {
        /* +1 */
        await _pool.mintPrimeFromPool(
            collateral,
            payment,
            strikeAddress,
            expiration,
            Bob,
            {from: Bob, value: premium}
        )
        nonce = nonce + 1;
        /* +1 Liability */
        await getPoolBalances(_pool);
        /* = 1 pool, 1 liability, 0 assets */
    });

    it('can Exercise Pool Prime', async () => {
        /* +1 */
        await _prime.exercise(1, {from: Bob});
        /* -1, -1 liability */
        await getPoolBalances(_pool);
        /* = 1 pool, 1 assets, 0 liability */
    });

    it('can withdraw dividends', async () => {
        /* +1 */
        let withdrawAmt = await web3.utils.toWei('3');
        /* -3, +1 loss */
        await _pool.withdrawLpFunds(withdrawAmt, Alice);
        await getPoolBalances(_pool);
        /* -2, pool = 0 */
    });

    it('can add another LP', async () => {
        /* +1 */
        let depositAmt = await web3.utils.toWei('4');
        /* +5 */
        let withdrawAmt = await web3.utils.toWei('1');
        /* -1 */
        let lp2 = await _pool.deposit(depositAmt, {from: Bob, value: depositAmt});
        console.log('Deposit 4')
        await getPoolBalances(_pool);
        let lp1Withdraw = await _pool.withdrawLpFunds(withdrawAmt, Alice);
        console.log('Withdraw 1')
        let bals = await getPoolBalances(_pool);
        let depositNotWei = await web3.utils.fromWei(depositAmt)
        assert.strictEqual(bals.pool, depositNotWei, 'Pool should have Lp2 deposit');
        /* assert.strictEqual(bals.etherBal, depositNotWei, 'Pools eth balance should be deposit'); */
        assert.strictEqual(bals.totalDeposit, depositNotWei, 'Total deposit should be deposit');
        /* pool = 5 */
    });

    it('adds liability then withdraws', async () => {
        let pool = await web3.utils.toWei('6');
        let lp2Deposit = await web3.utils.toWei('6');
        let liable = await web3.utils.toWei('4');
        await _pool.mintPrimeFromPool(
            liable,
            payment,
            strikeAddress,
            expiration,
            Bob,
            {from: Bob, value: premium}
        )
        nonce = nonce + 1;
        let withdrawAmt = await web3.utils.toWei('4');
        console.log('Liable + 4')
        await getPoolBalances(_pool);
        console.log('Withdraw 4')
        let lp2Withdraw = await _pool.withdrawLpFunds(withdrawAmt, Bob, {from: Bob});
        let bals = await getPoolBalances(_pool);
        let withdrawableAmount = ('')
    });

    it('LP closes their position by paying liability', async () => {
        let lpDeposit = await web3.utils.toWei('2');
        let total = await _pool._totalDeposit();
        let liable = await _pool._liability();
        let lpFunds = await _pool._collateral(Alice);
        let rev = await _pool._revenue();
        let liableUser =  liable * lpFunds / total + rev * lpFunds / total;
        await _pool.closePosition(lpDeposit, {value: lpDeposit});
        let bals = await getPoolBalances(_pool);
        console.log(
            'total deposit in contract');
            console.log(bals.totalDeposit);
            console.log('total deposit previous');
            console.log((total / 10**18).toString());
            console.log('difference between total deposits');
            console.log((bals.totalDeposit - (total /10**18)));
            console.log('user liability');
            console.log(liableUser / 10**18);
            console.log('total difference - user difference');
            console.log((bals.totalDeposit - (total /10**18)) + ((lpFunds - liableUser )/ 10**18));
            console.log('User remainder');
            console.log((lpFunds - liableUser )/ 10**18);
            console.log('total calculated - difference between funds and liability');
            console.log((total - (lpFunds - liableUser) ));
            console.log('total - liability');
            console.log((bals.totalDeposit - (liableUser /10**18)));
            console.log('total - liability + calc total');
            console.log((bals.totalDeposit - (liableUser /10**18) + ((total /10**18))));
        
    });

    it('LP closes their position when no liabilities', async () => {
        await _prime.exercise(nonce, {from: Bob});
        let lpDeposit = await web3.utils.toWei('1');
        await getPoolBalances(_pool);
        let strikeBal = await web3.utils.fromWei(await _tUSD.balanceOf(_pool.address));
        console.log({strikeBal})
        await _pool.closePosition(lpDeposit, {value: lpDeposit});
        let bals = await getPoolBalances(_pool);
    });

    it('can fulfill unfilled buy order from exchange', async () => {
        let buyOrderUnfilled = await _exchange.buyOrderUnfilled(
            premium,
            collateral,
            _pool.address,
            payment,
            strikeAddress,
            expiration,
            {from: Bob, value: (10**16)}
        );
        nonce = nonce + 1;
        console.log(await _prime.ownerOf(nonce), Bob);
        console.log({buyOrderUnfilled}, buyOrderUnfilled.logs);
        let bals = await getPoolBalances(_pool);
    }); 


    it('can exercise exchange minted prime', async () => {
        await _prime.exercise(nonce, {from: Bob});
        let bals = await getPoolBalances(_pool);
    });

    it('can mint a prime using the pools address as the yak', async () => {
        await _prime.createPrime(
            collateral,
            _pool.address,
            payment,
            strikeAddress,
            expiration,
            Bob,
            {from: Bob, value: collateral}
        )
        nonce = nonce + 1;
        await getPoolBalances(_pool);
        console.log('Primes Eth Bal', await web3.utils.fromWei((await web3.eth.getBalance(_prime.address))));
        console.log('Bobs Eth Bal', await web3.utils.fromWei((await web3.eth.getBalance(Bob))));
        await _prime.exercise(nonce, {from: Bob});
        await _prime.withdraw(collateral, _pool.address, {from: Bob});
        console.log('Primes Eth Bal', await web3.utils.fromWei((await web3.eth.getBalance(_prime.address))));
        console.log('Bobs Eth Bal', await web3.utils.fromWei((await web3.eth.getBalance(Bob))));
        await getPoolBalances(_pool);
    });

    it('can mint a prime using the pools address as the wax', async () => {
        await _prime.createPrime(
            payment,
            strikeAddress,
            collateral,
            _pool.address,
            expiration,
            Bob,
            {from: Bob}
        )
        nonce = nonce + 1;
        await getPoolBalances(_pool);
        console.log('Primes Eth Bal', await web3.utils.fromWei((await web3.eth.getBalance(_prime.address))));
        console.log('Bobs Eth Bal', await web3.utils.fromWei((await web3.eth.getBalance(Bob))));
        await _prime.exercise(nonce, {from: Bob, value: collateral});
        await _prime.withdraw(payment, strikeAddress, {from: Bob});
        await _prime.withdraw(collateral, _pool.address, {from: Bob});
        console.log('Primes Eth Bal', await web3.utils.fromWei((await web3.eth.getBalance(_prime.address))));
        console.log('Bobs Eth Bal', await web3.utils.fromWei((await web3.eth.getBalance(Bob))));
        await getPoolBalances(_pool);
    });
})