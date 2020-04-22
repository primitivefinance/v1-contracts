const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const ControllerOption = artifacts.require('ControllerOption');
const ControllerMarket = artifacts.require('ControllerMarket');
const ControllerExchange = artifacts.require('ControllerExchange');
const ControllerPool = artifacts.require('ControllerPool');
const ControllerRedeem = artifacts.require('ControllerRedeem');
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const PrimeOption = artifacts.require('PrimeOption.sol');
const PrimeExchange = artifacts.require('PrimeExchange.sol');
const PrimePool = artifacts.require('PrimePool.sol');
const PrimeRedeem = artifacts.require('PrimeRedeem');

contract('Controller Market', accounts => {
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
        strikeAmount,
        _controllerExchange,
        _controllerMarket,
        _controllerPool
        ;

    async function getGas(func, name) {
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    beforeEach(async () => {
        // get values that wont change
        _controllerExchange = await ControllerExchange.deployed();
        _controllerMarket = await ControllerMarket.deployed();
        _controllerPool = await ControllerPool.deployed();
        _controllerRedeem = await ControllerRedeem.deployed();
        /* _pool20 = await PrimePool.deployed(); */
        _prime = await Prime.deployed();
        _tUSD = await tUSD.deployed();
        _strike = _tUSD;
        /* _rPulp = await PrimeRedeem.deployed(); */
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
            options = await ControllerOption.deployed();
            nonce = await options._nonce();
            prime20Address = await options._primeMarkets(nonce);
            /* _prime20 = await PrimeOption.at(prime20Address); */
            /* _exchange20 = await PrimeExchange.deployed(); */
            collateral = prime20Address;
        });

        describe('createMarket()', () => {
            beforeEach(async () => {
                options = await ControllerOption.deployed();
                nonce = await options._nonce();
                prime20Address = await options._primeMarkets(nonce);
                /* _prime20 = await PrimeOption.at(prime20Address); */
                /* _exchange20 = await PrimeExchange.deployed(); */
                collateral = prime20Address;
            });

            it('adds a new market', async () => {
                let isCall = true;
                let name = 'Redeem Primitive LP';
                let symbol = 'cPulp';
                /* let market = await _controllerMarket.addMarket(
                    _prime20.address,
                    MAINNET_COMPOUND_ETH,
                    _controllerExchange.address,
                    _controllerPool.address
                );

                console.log({market}, market.receipt.logs) */

                let market = await _controllerMarket.createMarket(
                    toWei('1'),
                    toWei('10'),
                    _strike.address,
                    expiry,
                    isCall,
                    "Test Option Market",
                    {from: Alice}
                );
                console.log(await _controllerMarket._markets(1));
            });
        });
    });
})