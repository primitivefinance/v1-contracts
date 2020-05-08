const { expect } = require("chai");
const truffleAssert = require('truffle-assertions');
const BigNumber = require("bignumber.js");
const daiABI = require("../contracts/test/abi/dai");
const Weth = require('../contracts/test/abi/WETH9.json');
const Dai = artifacts.require("DAI");
const PrimeOption = artifacts.require("PrimeOption");
const PrimePool = artifacts.require("PrimePool");
const PrimeTrader = artifacts.require("PrimeTrader");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const PrimeOracle = artifacts.require("PrimeOracle");
const UniFactoryLike = artifacts.require("UniFactoryLike");
const UniExchangeLike = artifacts.require("UniExchangeLike");
const wethArtifact = require("canonical-weth");

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
    const MIN_LIQUIDITY = 10**4;
    const ACCURACY = 10**12;

    // CORE ADDRESSES
    const TREASURER ='0x9eb7f2591ed42dee9315b6e2aaf21ba85ea69f8c';
    const MAINNET_DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const MAINNET_ORACLE = '0xdA17fbEdA95222f331Cb1D252401F4b44F49f7A0';
    const MAINNET_COMPOUND_ETH = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    const MAINNET_WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
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

    let DAI,
        WETH,
        tokenP,
        tokenPULP,
        _tokenU,
        _tokenS,
        tokenU,
        tokenS,
        marketId,
        poolName,
        poolSymbol,
        optionName,
        optionSymbol,
        redeemName,
        redeemSymbol,
        base,
        price,
        expiry,
        trader,
        prime,
        redeem,
        oracle,
        pool,
        factory,
        exchange
        ;

    before(async () => {
        DAI = await Dai.new(MILLION_ETHER);
        WETH = await wethArtifact.new();
        await WETH.deposit({from: Alice, value: FIVE_ETHER});
        await WETH.deposit({from: Bob, value: FIVE_ETHER});

        _tokenU = DAI;
        _tokenS = WETH;
        tokenU = DAI.address;
        tokenS = WETH.address;
        marketId = 1;
        poolName = "ETH Short Put Pool LP";
        poolSymbol = "PULP";
        optionName = "ETH Put 200 DAI Expiring May 30 2020";
        optionSymbol = "PRIME";
        redeemName = "ETH Put Redeemable Token";
        redeemSymbol = "REDEEM";
        base = toWei('200');
        price = toWei('1');
        expiry = '1590868800'; // May 30, 2020, 8PM UTC

        trader = await PrimeTrader.new(tokenS);
        prime = await PrimeOption.new(
            optionName,
            optionSymbol,
            marketId,
            tokenU,
            tokenS,
            base,
            price,
            expiry
        );
        tokenP = prime.address;
        redeem = await PrimeRedeem.new(redeemName, redeemSymbol, prime.address, tokenS);
        oracle = await PrimeOracle.new(MAINNET_ORACLE);
        pool = await PrimePool.new(
            WETH.address,
            prime.address,
            oracle.address,
            MAINNET_UNI_FACTORY,
            poolName,
            poolSymbol
        );
        tokenPULP = pool.address;
        await prime.initTokenR(redeem.address);
        /* await pool.addMarket(prime.address); */

        factory = await UniFactoryLike.new(MAINNET_UNI_FACTORY);
        const exchangeAddress = await factory.getExchange(MAINNET_DAI);
        exchange = await UniExchangeLike.new(exchangeAddress);

        await DAI.approve(pool.address, MILLION_ETHER);
        await WETH.approve(pool.address, MILLION_ETHER);
    });

    describe("Deployment", () => {
        it("Should deploy with the right variables", async () => {
            expect(await pool.name()).to.be.eq(poolName);
            expect(await pool.symbol()).to.be.eq(poolSymbol);
            expect((await pool.WETH()).toString().toUpperCase()).to.be.eq(MAINNET_WETH.toUpperCase());
            expect((await pool.oracle()).toString().toUpperCase()).to.be.eq((oracle.address).toUpperCase());
            expect((await pool.WETH()).toString().toUpperCase()).to.be.eq((await prime.tokenS()).toUpperCase());
            expect((await pool.oracle()).toString().toUpperCase()).to.be.eq((oracle.address).toUpperCase());
        });
    });

    describe("Pool.deposit()", () => {
        it("should revert if inTokenU is below the min liquidity", async () => {
            await truffleAssert.reverts(
                pool.deposit(1),
                "ERR_BAL_UNDERLYING"
            );
        });
        it("should revert if inTokenU is above the user's balance", async () => {
            await truffleAssert.reverts(
                pool.deposit(MILLION_ETHER),
                "ERR_BAL_UNDERLYING"
            );
        });

        it("should deposit tokenU and receive tokenPULP", async () => {
            const deposit = async (amount) => {
                let balance0U = await _tokenU.methods.balanceOf(Alice).call();
                let balance0P = await pool.balanceOf(Alice);
                let balance0CU = await _tokenU.methods.balanceOf(pool.address).call();
                let balance0CP = await pool.totalSupply();
                console.log({amount});
                let depo = await pool.deposit(amount, {from: Alice});
                await truffleAssert.eventEmitted(depo, "Deposit");
                await truffleAssert.prettyPrintEmittedEvents(depo, "Deposit");

                let balance1U = await _tokenU.methods.balanceOf(Alice).call();
                let balance1P = await pool.balanceOf(Alice);
                let balance1CU = await _tokenU.methods.balanceOf(pool.address).call();
                let balance1CP = await pool.totalSupply();

                let deltaU = balance1U - balance0U;
                let deltaP = balance1P - balance0P;
                let deltaCU = balance1CU - balance0CU;
                let deltaCP = balance1CP - balance0CP;

                expect(deltaU).to.be.within(-amount+ACCURACY, -amount-ACCURACY);
                expect(deltaP).to.be.within(+amount+ACCURACY, +amount-ACCURACY);
                expect(deltaCU).to.be.within(+amount+ACCURACY, +amount-ACCURACY);
                expect(deltaCP).to.be.within(+amount+ACCURACY, +amount-ACCURACY);
            }

            const run = async (runs) => {
                for(let i = 0; i < runs; i++) {
                    let amt = (Math.floor(ONE_ETHER * Math.random())).toString();
                    await deposit(amt);
                }
            }

            await run(5);
            console.log('[POOL BALANCE]', fromWei(
                    await _tokenU.methods.balanceOf(pool.address).call()
                )
            );
        });
    });
});
