const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const Factory = artifacts.require("Factory");
const FactoryRedeem = artifacts.require("FactoryRedeem");
const PrimeOption = artifacts.require("PrimeOption");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const PrimeFlash = artifacts.require("PrimeFlash");
const Weth = artifacts.require("WETH9");
const Dai = artifacts.require("DAI");
const BadToken = artifacts.require("BadERC20");
const constants = require("./constants");
const {
    ERR_ZERO,
    ERR_BAL_STRIKE,
    ERR_BAL_UNDERLYING,
    ERR_NOT_OWNER,
    ERR_PAUSED,
    ERR_EXPIRED,
    ERR_NOT_VALID,
    ONE_ETHER,
    FIVE_ETHER,
    HUNDRED_ETHER,
    THOUSAND_ETHER,
    ZERO_ADDRESS,
} = constants;

contract("Prime", (accounts) => {
    // WEB3
    const { toWei } = web3.utils;

    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let weth, dai, prime, redeem;
    let tokenU, tokenS, _tokenU, _tokenS, tokenP, tokenR;
    let base, price, expiry;
    let factory, factoryRedeem;
    let flash;

    const assertBNEqual = (actualBN, expectedBN, message) => {
        assert.equal(actualBN.toString(), expectedBN.toString(), message);
    };

    before(async () => {
        weth = await Weth.new();
        dai = await Dai.new(THOUSAND_ETHER);
        factory = await Factory.new();
        factoryRedeem = await FactoryRedeem.new(factory.address);
        await factory.initialize(factoryRedeem.address);

        optionName = "Primitive V1 Vanilla Option";
        optionSymbol = "PRIME";
        redeemName = "Primitive Strike Redeem";
        redeemSymbol = "REDEEM";

        _tokenU = dai;
        _tokenS = weth;
        tokenU = dai.address;
        tokenS = weth.address;
        base = toWei("200");
        price = toWei("1");
        expiry = "1590868800"; // May 30, 2020, 8PM UTC

        /* createPrime = async () => {
            let prime = await PrimeOption.new(
                tokenU,
                tokenS,
                base,
                price,
                expiry
            );
            return prime;
        };

        createRedeem = async () => {
            let redeem = await PrimeRedeem.new(tokenP, tokenS);
            return redeem;
        }; */

        createPrime = async () => {
            await factory.deployOption(tokenU, tokenS, base, price, expiry);
            let id = await factory.getId(tokenU, tokenS, base, price, expiry);
            let prime = await PrimeOption.at(await factory.options(id));
            return prime;
        };

        prime = await createPrime();
        tokenP = prime.address;
        tokenR = await prime.tokenR();
        redeem = await PrimeRedeem.at(tokenR);
        flash = await PrimeFlash.new(tokenP);

        getBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        };

        getCache = async (cache) => {
            switch (cache) {
                case "u":
                    cache = new BN(await prime.cacheU());
                    break;
                case "s":
                    cache = new BN(await prime.cacheS());
                    break;
            }
            return cache;
        };
    });
    describe("Prime Flash", () => {
        it("execute a flash loan that returns the outTokenU", async () => {
            // mint some options so the cacheU is > 0
            let inTokenU = ONE_ETHER;
            await _tokenU.transfer(tokenP, inTokenU);
            await prime.mint(Alice);
            await flash.goodFlashLoan(ONE_ETHER);
            expect(ONE_ETHER).to.be.eq((await prime.cacheU()).toString());
        });
        it("should revert because the flash loan doesnt return the capital", async () => {
            // mint some options so the cacheU is > 0
            let inTokenU = ONE_ETHER;
            await _tokenU.transfer(tokenP, inTokenU);
            await prime.mint(Alice);
            await truffleAssert.reverts(
                flash.badFlashLoan(ONE_ETHER),
                ERR_ZERO
            );
        });
    });
});
