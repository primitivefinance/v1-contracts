const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const tETH = artifacts.require("tETH");
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const Exchange = artifacts.require('Exchange');
const Pool = artifacts.require('Pool');

contract('Prime - Local', accounts => {

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
    });
    

    it('create prime with yak == erc20', async () => {
        /* Base Parameters */
        let minter = Bob;
        let one = await web3.utils.toWei('1');
        let ten = await web3.utils.toWei('10');
        let collateral = _tETH.address();
        let strike = _tUSD.address();
        let expiry = '1587607322';
        let receiver = minter;

        /* Get revert with balance < xis */
        await truffleAssert.reverts(
            _prime.createPrime(
                one,
                collateral,
                ten,
                strike,

            ),
            "a < b"
        );
        /* Check for ERC20 interface parameter */

        /* Assert liability of msg sender added the xis */

        /* Assert returns the nonce of the token */
    });

    it('should be able to withdraw funds', async () => {

    });

    it('should be able to withdraw funds', async () => {

    });

    it('should be able to withdraw funds', async () => {

    });

    it('should be able to withdraw funds', async () => {

    });

    it('should be able to withdraw funds', async () => {

    });

    it('should be able to withdraw funds', async () => {

    });

    it('should be able to withdraw funds', async () => {

    });

    it('should be able to withdraw funds', async () => {

    });

    it('should be able to withdraw funds', async () => {

    });

    it('should be able to withdraw funds', async () => {

    });
})