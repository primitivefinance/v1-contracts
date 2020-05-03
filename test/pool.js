const { expect } = require("chai");
const daiABI = require("../contracts/test/abi/dai");
const Weth = require('../contracts/test/abi/WETH9.json');
const PrimeOption = artifacts.require("PrimeOption");
const PrimePool = artifacts.require("PrimePool");
const PrimeTrader = artifacts.require("PrimeTrader");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const UniFactoryLike = artifacts.require("UniFactoryLike");
const UniExchangeLike = artifacts.require("UniExchangeLike");

contract("Pool contract", accounts => {
    // WEB3
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const { getBalance } = web3.eth;

    // ERROR CODES
    const ERR_ZERO = "ERR_ZERO";
    const ERR_BAL_ETH = "ERR_BAL_ETH";
    const ERR_NOT_OWNER = "ERR_NOT_OWNER";
    const ERR_BAL_PRIME = "ERR_BAL_PRIME";
    const ERR_BAL_STRIKE = "ERR_BAL_STRIKE";
    const ERR_BAL_REDEEM = "ERR_BAL_REDEEM";
    const ERR_BAL_TOKENS = "ERR_BAL_TOKENS";
    const ERR_BAL_OPTIONS = "ERR_BAL_OPTIONS";
    const ERR_OPTION_TYPE = "ERR_OPTION_TYPE";

    // COMMON AMOUNTS
    const ROUNDING_ERR = 10**8;
    const ONE_ETHER = toWei('1');
    const TWO_ETHER = toWei('2');
    const FIVE_ETHER = toWei('5');
    const TEN_ETHER = toWei('10');
    const FIFTY_ETHER = toWei('50');
    const HUNDRED_ETHER = toWei('100');
    const THOUSAND_ETHER = toWei('1000');
    const MILLION_ETHER = toWei('1000000');

    // CORE ADDRESSES
    const TREASURER ='0x9eb7f2591ed42dee9315b6e2aaf21ba85ea69f8c';
    const MAINNET_DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const MAINNET_ORACLE = '0xdA17fbEdA95222f331Cb1D252401F4b44F49f7A0';
    const MAINNET_COMPOUND_ETH = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    const MAINNET_WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const MAINNET_UNI_FACTORY = '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95';

    // ACCOUNTS
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

  before(async () => {
    const DAI = new web3.eth.Contract(daiABI, MAINNET_DAI);

    // Initialize our accounts with forked mainnet DAI.
    mintDai = async (account) => {
        await web3.eth.sendTransaction({
            from: Alice,
            to: TREASURER,
            value: toWei('0.1')
        });

        await DAI.methods
            .transfer(account, toWei('1000').toString())
            .send({ from: TREASURER, gasLimit: 800000 });
        const daiBalance = await DAI.methods.balanceOf(account).call();
        console.log(fromWei(daiBalance), DAI._address);
    }

    await mintDai(Alice);
    await mintDai(Bob);

    const WETH = new web3.eth.Contract(Weth.abi, await _controllerPool.weth());
    await WETH.methods.deposit().send({from: Alice, value: HUNDRED_ETHER});
    await WETH.methods.deposit().send({from: Bob, value: HUNDRED_ETHER});

    const _tokenU = DAI;
    const _tokenS = WETH;
    const tokenU = MAINNET_DAI;
    const tokenS = MAINNET_WETH;
    const marketId = 1;
    const poolName = "ETH Short Put Pool LP";
    const poolSymbol = "PULP";
    const optionName = "ETH Put 200 DAI Expiring May 30 2020";
    const optionSymbol = "PRIME";
    const redeemName = "ETH Put Redeemable Token";
    const redeemSymbol = "REDEEM";
    const base = toWei('200');
    const price = toWei('1');
    const expiry = '1590868800'; // May 30, 2020, 8PM UTC

    const trader = await PrimeTrader.new(MAINNET_WETH);
    const prime = await PrimeOption.new(
        optionName,
        optionSymbol,
        marketId,
        tokenU,
        tokenS,
        base,
        price,
        expiry
    );
    const redeem = await PrimeRedeem.new(redeemName, redeemSymbol, prime.address, tokenS);
    const pool = await PrimePool.new(
        MAINNET_WETH,
        MAINNET_ORACLE,
        MAINNET_UNI_FACTORY,
        poolName,
        poolSymbol
    );
    await prime.initTokenR(redeem.address);
    await pool.addMarket(prime.address);

    const factory = await UniFactoryLike.new(MAINNET_UNI_FACTORY);
    const exchangeAddress = await factory.getExchange(MAINNET_DAI);
    const exchange = await UniExchangeLike.new(exchangeAddress);

    

  });

  describe("Deployment", () => {
    it("Should deploy with the right supply", async () => {

    });
  });

  describe("Pool.deposit()", () => {
    it("Should deploy with the right supply", async () => {

    });
  });
});
