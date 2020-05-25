const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const BN = require("bn.js");
const setup = require("./setup");
const constants = require("./constants");
const utils = require("./utils");
const { toWei } = utils;
const { ONE_ETHER, THOUSAND_ETHER } = constants.VALUES;
const { ERR_ZERO } = constants.ERR_CODES;
const { newERC20, newWeth, newFlash, newOptionFactory, newPrimitive } = setup;

contract("Prime", (accounts) => {
    // ACCOUNTS
    const Alice = accounts[0];

    let tokenU, tokenS, tokenP;
    let base, price, expiry;
    let factory, flash, prime;
    let Primitive;

    before(async () => {
        factory = await newOptionFactory();

        // option parameters
        tokenU = await newERC20("Test DAI", "DAI", THOUSAND_ETHER);
        tokenS = await newWeth();
        base = toWei("200");
        price = toWei("1");
        expiry = "1590868800"; // May 30, 2020, 8PM UTC

        Primitive = await newPrimitive(
            factory,
            tokenU,
            tokenS,
            base,
            price,
            expiry
        );

        prime = Primitive.prime;
        redeem = Primitive.redeem;
        flash = await newFlash(prime.address);
    });
    describe("Prime Flash", () => {
        it("execute a flash loan that returns the outTokenU", async () => {
            // mint some options so the cacheU is > 0
            let inTokenU = ONE_ETHER;
            await tokenU.transfer(prime.address, inTokenU);
            await prime.mint(Alice);
            await flash.goodFlashLoan(ONE_ETHER);
            let fee = new BN(ONE_ETHER).sub(
                new BN(ONE_ETHER).div(new BN(1000))
            );
            expect((await prime.cacheU()).toString()).to.be.eq(fee.toString());
        });
        it("should revert because the flash loan doesnt return the capital", async () => {
            // mint some options so the cacheU is > 0
            let inTokenU = ONE_ETHER;
            await tokenU.transfer(prime.address, inTokenU);
            await prime.mint(Alice);
            await truffleAssert.reverts(
                flash.badFlashLoan(ONE_ETHER),
                ERR_ZERO
            );
        });
    });
});
