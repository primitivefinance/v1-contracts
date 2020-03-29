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
        nonce,
        tokenId
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

        await getPoolBalances(_pool);


    });
    

    /* it('should deposit funds', async () => {
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
    }); */

    it('handle a full protocol transaction', async () => {
        /* LP 1 deposits 0.1 ether into pool */
        console.log('LP deposits into Pool');
        let lp = Alice;
        let deposit = await web3.utils.toWei('0.1');
        let poolDeposit = await _pool.deposit(deposit, {from: lp, value: deposit});

        /* Pool has 0.1 ether to write options for */
        let collateralAmount = deposit;
        let collateral = _pool.address;

        let premium = await web3.utils.toWei('0.02');
        let totalCost = await web3.utils.toWei('0.1');

        /* Strike is 1 full tUSD token */
        let strikeAmount = await web3.utils.toWei('1');
        let strike = _tUSD.address;

        let expiration = '1600473585';
        
        let buyer = Bob;

        /* User submits unfilled buy order on DEX which defaults to the Pool filling it */
        console.log('Buy order submitted');
        let buyOrder = await _exchange.buyOrderUnfilled(
            premium,
            collateralAmount, 
            collateral, 
            strikeAmount, 
            strike, 
            expiration, 
            {from: buyer, value: totalCost}
        );

        let tokenId = await _prime.nonce();

        /* Buyer then exercises the Prime */
        await _tUSD.approve(_prime.address, strikeAmount, {from: buyer});
        await _tUSD.mint(buyer, strikeAmount);

        console.log('Exercises ether denominated prime');
        let exercise = await _prime.exercise(tokenId, {from: buyer});

        /* Buyer withdraws */
        console.log('exercisor withdraws ether that was the collateral');
        let buyWithdrawal = await _prime.withdraw(collateralAmount, _pool.address, {from: buyer});

        await getPoolBalances(_pool);

    });

})