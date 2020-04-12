const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const Options = artifacts.require('Options');
const tETH = artifacts.require("tETH");
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const Exchange = artifacts.require('Exchange');
const Pool = artifacts.require('Pool');
const PrimeERC20 = artifacts.require('PrimeERC20.sol');
const ExchangeERC20 = artifacts.require('ExchangeERC20.sol');
const PoolERC20 = artifacts.require('PoolERC20.sol');

contract('Prime ERC-20', accounts => {

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
        let liability = await web3.utils.fromWei(await poolInstance._liability());
        let lp1Funds = await web3.utils.fromWei(await poolInstance.balanceOf(Alice));
        let lp1Ether = await web3.utils.fromWei((await web3.eth.getBalance(Alice)).toString());
        let lp2Funds = await web3.utils.fromWei(await poolInstance.balanceOf(Bob));
        let lp2Ether = await web3.utils.fromWei((await web3.eth.getBalance(Bob)).toString());
        let totalDeposit = await web3.utils.fromWei(await poolInstance.totalSupply());
        console.log({/* pool, */ liability, lp1Funds, lp1Ether, lp2Funds, lp2Ether, totalDeposit})
        return ({/* pool, */ liability, lp1Funds, lp1Ether, lp2Funds, lp2Ether, totalDeposit});
    }

    describe('PrimeERC20.sol', () => {
            let minter, collateralAmount, strikeAmount, collateral, strike, expiry, receiver;
            beforeEach(async () => {
                _prime = await Prime.deployed();
                _tUSD = await tUSD.deployed();
                _tETH = await tETH.deployed();
                _exchange = await Exchange.deployed();
                _pool = await Pool.deployed();
                options = await Options.deployed();
                let prime20Address = await options._primeMarkets(1);
                _prime20 = await PrimeERC20.at(prime20Address);
                await _tUSD.approve(_prime20.address, '10000000000000000000');
                await _tETH.approve(_prime20.address, '10000000000000000000');
                await _tUSD.approve(_prime.address, '10000000000000000000');
                await _tETH.approve(_prime.address, '10000000000000000000');

                minter = Alice;
                collateralAmount = await web3.utils.toWei('1');
                strikeAmount = await web3.utils.toWei('10');
                collateral = _tETH.address;
                strike = _tUSD.address;
                expiry = '1607775120';
                receiver = minter;
                
            });
            it('gets symbol', async () => {
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter}
                );
                await _prime20.setParentToken(1);
                let symbol = await _prime20.symbol();
                console.log('[SYMBOL]', symbol);
                
            });

        describe('deposit()', () => {
            let minter, collateralAmount, strikeAmount, collateral, strike, expiry, receiver;
            beforeEach(async () => {
                _prime = await Prime.deployed();
                _tUSD = await tUSD.deployed();
                _tETH = await tETH.deployed();
                _exchange = await Exchange.deployed();
                _pool = await Pool.deployed();
                options = await Options.deployed();
                let prime20Address = await options._primeMarkets(1);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchangePool = await ExchangeERC20.deployed();
                
                await _tUSD.approve(_prime20.address, '10000000000000000000');
                await _tETH.approve(_prime20.address, '10000000000000000000');
                await _tUSD.approve(_prime.address, '10000000000000000000');
                await _tETH.approve(_prime.address, '10000000000000000000');

                minter = Alice;
                collateralAmount = await web3.utils.toWei('1');
                strikeAmount = await web3.utils.toWei('10');
                collateral = _tETH.address;
                strike = _tUSD.address;
                expiry = '1607775120';
                receiver = minter;

                getBalance = async (instance, user, name) => {
                    let balance = 1;
                    let symbol = "ERR"
                    /* let balance = await instance.balanceOf(user);
                    let symbol = await instance.symbol();
                    balance = await web3.utils.fromWei(balance); */
                    console.log(`[${symbol}]`, `[${name}]`,  balance);
                    return balance;
                }

                getEtherBalance = async (user, name) => {
                    let balance = 1;
                    /* let balance = await web3.eth.getBalance(user);
                    balance = await web3.utils.fromWei(balance); */
                    console.log(`[ETHr]`, `[${name}]`, balance);
                    return balance;
                }

                
                
            });

            it('should zero sum', async () => {
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter}
                );
                await _prime20.setParentToken(1);
                let startEthBob = await getEtherBalance(Bob, "BOBER");
                let startStrikeBob = await getBalance(_tUSD, Bob, "BOBER");
                let startEthAlice = await getEtherBalance(Alice, "ALICE");
                let startStrikeAlice = await getBalance(_tUSD, Alice, "ALICE");
                
                await getEtherBalance(_prime20.address, "PRIME");
                await getBalance(_tUSD, _prime20.address, "PRIME");
                // Each deposit 1
                await _prime20.deposit({from: Alice, value: collateralAmount});
                await _prime20.deposit({from: Bob, value: collateralAmount});
                await getEtherBalance(_prime20.address, "PRIME");

                // Alice Swaps
                await _prime20.swap(collateralAmount, {from: Alice});
                await getEtherBalance(_prime20.address, "PRIME");
                await getBalance(_tUSD, _prime20.address, "PRIME");
                await getBalance(_tUSD, Alice, "ALICE");

                // Bob Swaps
                await _tUSD.transfer(Bob, strikeAmount, {from: Alice});
                await _tUSD.approve(_prime20.address, strikeAmount, {from: Bob});
                await _prime20.swap(collateralAmount, {from: Bob});
                await getEtherBalance(_prime20.address, "PRIME");
                await getBalance(_tUSD, _prime20.address, "PRIME");
                await getBalance(_tUSD, Bob, "BOBER");

                // Bob Withdraws
                await _prime20.withdraw(collateralAmount, {from: Bob});
                await getBalance(_tUSD, Bob, "BOBER");

                // Alice Withdraws
                await _prime20.withdraw(collateralAmount, {from: Alice});
                await getBalance(_tUSD, Alice, "ALICE");

                

                let endEthBob = await getEtherBalance(Bob, "BOBER");
                let endStrikeBob = await getBalance(_tUSD, Bob, "BOBER");
                let endEthAlice = await getEtherBalance(Alice, "ALICE");
                let endStrikeAlice = await getBalance(_tUSD, Alice, "ALICE");

                /* assert.strictEqual(
                    (endEthBob).toString(),
                    ((startEthBob*1-0.5)).toString(),
                    'BOB_ETH_BAL NOT EQUAL'
                ); */

                await getBalance(_prime20, Bob, "BOBER");
                await getEtherBalance(Bob, "BOBER");
                await getBalance(_prime20, minter, "ALICE");
                await getEtherBalance(minter, "ALICE");
                await getBalance(_tUSD, _prime20.address, "PRIME");
                await getEtherBalance(_prime20.address, "PRIME");
            });

            it('should close', async () => {
                let startEthBob = await getEtherBalance(Bob, "BOBER");
                
                // Each deposit 1
                await _prime20.deposit({from: Bob, value: collateralAmount});


                await getBalance(_prime20, Bob, "BOBER");
                await getEtherBalance(Bob, "BOBER");
                await getEtherBalance(_prime20.address, "PRIME");

                // Bob Closes
                await _prime20.close(collateralAmount, {from: Bob});
                
                await getBalance(_prime20, Bob, "BOBER");
                await getEtherBalance(Bob, "BOBER");
                await getEtherBalance(_prime20.address, "PRIME");
            });

            it('should get exchange y', async () => {
                let qInput = await web3.utils.toWei('1');
                let rInput = await web3.utils.toWei('10');
                let rOutput = await web3.utils.toWei('10');
                let y = await _exchangePool.getInputPrice(qInput, rInput, rOutput);
                console.log(await web3.utils.fromWei(y));
                let qOutput = await web3.utils.toWei('1');
                let x = await _exchangePool.getOutputPrice(qOutput, rInput, rOutput);
                console.log(await web3.utils.fromWei(x));
            });

            it('should add liquidity', async () => {
                await getEtherBalance(minter, "ALICE");
                let two = await web3.utils.toWei('2');
                // get option tokens
                await _prime20.deposit({from: minter, value: two});
                // should be 1 option token, approve to exchangePool
                await _prime20.approve(_exchangePool.address, two, {from: minter});

                // add liquidity by sending 2 {two} ETH and PRIME ERC-20
                await _exchangePool.addLiquidity(two, two, {from: minter, value: two});
                
                // get more prime erc-20 tokens

                // get option tokens
                await _prime20.deposit({from: minter, value: two});
                // should be 2 option token, approve to exchangePool
                await _prime20.approve(_exchangePool.address, two, {from: minter});

                // check input price
                let y = await _exchangePool.getInputPrice(collateralAmount, collateralAmount, collateralAmount);

                // try to sell the tokens using the initial liquidity
                await getEtherBalance(minter, "ALICE");
                console.log('[SELLPRICE]', await web3.utils.fromWei(y));
                await _exchangePool.swapTokensToEth(collateralAmount, y, minter, {from: minter})

                await getEtherBalance(minter, "ALICE");
            });

            it('should remove liquidity', async () => {
                await getEtherBalance(minter, "ALICE");
                await getBalance(_prime20, minter, "ALICE");
                let half = await web3.utils.toWei('0.5');
                let minPrice = (
                    collateralAmount*1 * 
                    (await web3.eth.getBalance(_exchangePool.address)) / 
                    (await _prime20.balanceOf(_exchangePool.address))
                ).toString();

                await _exchangePool.removeLiquidity(
                    collateralAmount,
                    minPrice,
                    minPrice,
                    {from: minter}
                );

                await getEtherBalance(minter, "ALICE");
                await getBalance(_prime20, minter, "ALICE");
            });

            it('should addLiquidity() and then depositAndSell()', async () => {
                await getEtherBalance(minter, "ALICE");
                let two = await web3.utils.toWei('2');
                // get option tokens
                await _prime20.deposit({from: minter, value: two});
                // should be 2 option token, approve to exchangePool
                await _prime20.approve(_exchangePool.address, await web3.utils.toWei('10000000'), {from: minter});

                // get lp tokens of pool
                console.log(await web3.utils.fromWei(await _exchangePool.totalSupply()));
                console.log(await web3.utils.fromWei(await _exchangePool.tokenReserves()));
                await getEtherBalance(_exchangePool.address, "EPOOL");
                // add liquidity by sending 2 {two} ETH and PRIME ERC-20
                await _exchangePool.addLiquidity(collateralAmount, collateralAmount, {from: minter, value: collateralAmount});
                
                // get more prime erc-20 tokens

                // get option tokens
                await getEtherBalance(minter, "ALICE");
                await _prime20.depositAndSell({from: minter, value: collateralAmount});
                await getEtherBalance(minter, "ALICE");
            });
        });

        describe('pPulp deposit()', () => {
            let minter, collateralAmount, strikeAmount, collateral, strike, expiry, receiver;
            beforeEach(async () => {
                _prime = await Prime.deployed();
                _tUSD = await tUSD.deployed();
                _tETH = await tETH.deployed();
                _exchange = await Exchange.deployed();
                _pool = await Pool.deployed();
                options = await Options.deployed();
                let prime20Address = await options._primeMarkets(1);
                _prime20 = await PrimeERC20.at(prime20Address);
                _exchangePool = await ExchangeERC20.deployed();
                _pool20 = await PoolERC20.deployed();
                await _tUSD.approve(_prime20.address, '10000000000000000000');
                await _tETH.approve(_prime20.address, '10000000000000000000');
                await _tUSD.approve(_prime.address, '10000000000000000000');
                await _tETH.approve(_prime.address, '10000000000000000000');

                minter = Alice;
                collateralAmount = await web3.utils.toWei('1');
                strikeAmount = await web3.utils.toWei('10');
                collateral = _tETH.address;
                strike = _tUSD.address;
                expiry = '1607775120';
                receiver = minter;

                getBalance = async (instance, user, name) => {
                    let balance = 1;
                    let symbol = "ERR"
                    /* let balance = await instance.balanceOf(user);
                    let symbol = await instance.symbol();
                    balance = await web3.utils.fromWei(balance); */
                    console.log(`[${symbol}]`, `[${name}]`,  balance);
                    return balance;
                }

                getEtherBalance = async (user, name) => {
                    let balance = 1;
                    /* let balance = await web3.eth.getBalance(user);
                    balance = await web3.utils.fromWei(balance); */
                    console.log(`[ETHr]`, `[${name}]`, balance);
                    return balance;
                }
            });

            it('deposit funds into poolerc20 and get pPulp', async () => {
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter}
                );
                await _prime20.setParentToken(1);
                let appr = await web3.utils.toWei('1000000');

                // add liquidity to exchange pool
                let two = await web3.utils.toWei('2');
                let ten = await web3.utils.toWei('10');
                // get option tokens
                await _prime20.deposit({from: minter, value: ten});
                // should be 1 option token, approve to exchangePool
                await _prime20.approve(_exchangePool.address, appr, {from: minter});
                // add liquidity by sending 2 {two} ETH and PRIME ERC-20
                console.log('[PRIME BALANCE]', await web3.utils.fromWei(await _prime20.balanceOf(minter)));
                console.log('[ePOOL Total Supply]', await web3.utils.fromWei(await _exchangePool.totalSupply()));
                await _exchangePool.addLiquidity(collateralAmount, await _prime20.balanceOf(minter), {from: minter, value: collateralAmount});

                // deposit funds into pool to get pPulp
                await _pool20.deposit(collateralAmount, {from: minter, value: collateralAmount});
                console.log('[PULP BALANCE]', await web3.utils.fromWei(await _pool20.balanceOf(minter)));
                let poolBal = await _pool20.getPoolBalance();
            });
        });
    });
})