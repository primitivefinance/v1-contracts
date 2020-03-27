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
        _exchange = await Exchange.deployed();
        _pool = await Pool.deployed();
        collateral = await web3.utils.toWei('0.1');
        payment = await web3.utils.toWei('1');
        /* collateralPoolAddress = _pool.address;
        strikeAddress = _tUSD.address;
        primeAddress = await _exchange.getPrimeAddress();
        expiration = '1587607322';
        premium = (13*10**15).toString(); */
        
        await getPoolBalances(_pool);


    });
    

    it('should deposit funds', async () => {
        let _LP = Alice;
        value = await web3.utils.toWei('0.1');
        let lpBal = await web3.utils.fromWei(await web3.eth.getBalance(_LP));
        console.log({lpBal})
        let deposit = await _pool.deposit(value, {from: _LP, value: value});
        console.log({lpBal})
        await getPoolBalances(_pool);
        console.log({deposit});
    });

    it('should withdraw funds', async () => {
        let _LP = Alice;
        value = await web3.utils.toWei('0.1');
        let lpBal = await web3.utils.fromWei(await web3.eth.getBalance(_LP));
        console.log({lpBal})
        let withdraw = await _pool.withdrawLpFunds(value, _LP, {from: _LP});
        console.log({lpBal})
        await getPoolBalances(_pool);
        console.log({withdraw}, withdraw.logs);
    });

    it('should deposit funds from two LPS then have the LPs withdraw', async () => {
        let _LP = Alice;
        value = await web3.utils.toWei('0.1');
        let lpBal = await web3.utils.fromWei(await web3.eth.getBalance(_LP));
        console.log({lpBal})


        let _LP2 = Bob;
        let lpBal2 = await web3.utils.fromWei(await web3.eth.getBalance(_LP2));
        console.log({lpBal2})


        let deposit = await _pool.deposit(value, {from: _LP, value: value});
        let deposit2 = await _pool.deposit(value, {from: _LP2, value: value});

        await getPoolBalances(_pool);
        console.log({lpBal, lpBal2})
        console.log({deposit, deposit2});

        let withdraw = await _pool.withdrawLpFunds(value, _LP, {from: _LP});
        let withdraw2 = await _pool.withdrawLpFunds(value, _LP2, {from: _LP2});

        await getPoolBalances(_pool);
        console.log({lpBal, lpBal2})
        console.log({deposit, deposit2});

        console.log({withdraw, withdraw2})
    });

    it('should deposit funds from two LPS then have primes minted from the pool', async () => {
        let _LP = Alice;
        value = await web3.utils.toWei('0.5');
        let lpBal = await web3.utils.fromWei(await web3.eth.getBalance(_LP));
        console.log({lpBal})


        let _LP2 = Bob;
        let lpBal2 = await web3.utils.fromWei(await web3.eth.getBalance(_LP2));
        console.log({lpBal2})


        let deposit = await _pool.deposit(value, {from: _LP, value: value});
        let deposit2 = await _pool.deposit(value, {from: _LP2, value: value});

        await getPoolBalances(_pool);
        console.log({lpBal, lpBal2})
        console.log({deposit, deposit2});

        let xis, yak, zed, wax, pow, gem;
        xis = value;
        yak = _pool.address;
        zed = payment;
        wax = _tUSD.address;
        pow = '1600473585';
        await _tUSD.approve(_prime.address, payment, {from: Bob});
        await _tUSD.mint(Bob, payment);
        /* TOKEN MINTED TO ADDRESS */
        await _exchange.setPoolAddress(_pool.address);
        let poolAssets = await web3.utils.fromWei(await _pool.getAvailableAssets());
        console.log({poolAssets})
        let bid = await web3.utils.toWei(('0.15').toString());
        let unfilled = await _exchange.buyOrderUnfilled(
            bid,
            xis, 
            yak, 
            zed, 
            wax, 
            pow, 
            {from: Bob, value: bid}
        );
        let tokenId = (await _prime.nonce()).toString();

        await getPoolBalances(_pool);
        console.log({unfilled, tokenId})

        await _prime.createPrime(
            xis, 
            yak, 
            zed, 
            wax, 
            pow,
            Bob, 
            {from: Bob, value: xis}
        );

        tokenId = (await _prime.nonce()).toString();

        await getPoolBalances(_pool);
        console.log({unfilled, tokenId})
    });

})