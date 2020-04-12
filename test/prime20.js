const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const tETH = artifacts.require("tETH");
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const Exchange = artifacts.require('Exchange');
const Pool = artifacts.require('Pool');
const PrimeERC20 = artifacts.require('PrimeERC20.sol');
const ExchangePool = artifacts.require('ExchangePool.sol');

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
                _prime20 = await PrimeERC20.deployed();
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
                _prime20 = await PrimeERC20.deployed();
                _exchangePool = await ExchangePool.deployed();
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
                    let balance = await instance.balanceOf(user);
                    let symbol = await instance.symbol();
                    balance = await web3.utils.fromWei(balance);
                    console.log(`[${symbol}]`, `[${name}]`,  balance);
                    return balance;
                }

                getEtherBalance = async (user, name) => {
                    let balance = await web3.eth.getBalance(user);
                    balance = await web3.utils.fromWei(balance);
                    console.log(`[ETHr]`, `[${name}]`, balance);
                    return balance;
                }

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
                
            });

            it('should zero sum', async () => {
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
                // get option tokens
                await _prime20.deposit({from: minter, value: collateralAmount});
                // should be 1 option token, approve to exchangePool
                await _prime20.approve(_exchangePool.address, collateralAmount, {from: minter});

                // add liquidity by sending 1 {collateralAmount} ETH and PRIME ERC-20
                await _exchangePool.addLiquidity(collateralAmount, collateralAmount, {from: minter, value: collateralAmount});
                
                // get more prime erc-20 tokens

                // get option tokens
                await _prime20.deposit({from: minter, value: collateralAmount});
                // should be 1 option token, approve to exchangePool
                await _prime20.approve(_exchangePool.address, collateralAmount, {from: minter});

                // try to sell the tokens using the initial liquidity
                await _exchangePool.swapTokensToEth(collateralAmount, collateralAmount, {from: minter})

                await getEtherBalance(minter, "ALICE");
            });


        });
    });
})