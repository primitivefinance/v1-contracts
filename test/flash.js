const { expect } = require("chai");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { parseEther } = require("ethers/utils");
const { ONE_ETHER, THOUSAND_ETHER } = constants.VALUES;
const { ERR_ZERO } = constants.ERR_CODES;
const { newWallets, newERC20, newWeth, newFlash, newRegistry, newOptionFactory, newPrimitive } = setup;

describe("Flash loan on option", () => {
    // ACCOUNTS
    let signers, Admin, User, Alice, Bob;

    let underlyingToken, strikeToken;
    let base, quote, expiry;
    let flash, optionToken, registry;
    let Primitive;

    before(async () => {
        signers = await newWallets();
        Admin = signers[0];
        User = signers[1];
        Alice = Admin._address;
        Bob = User._address;
        registry = await newRegistry(Admin);
        factoryOption = await newOptionFactory(Admin, registry);

        // option parameters
        underlyingToken = await newERC20(Admin, "Test DAI", "DAI", THOUSAND_ETHER);
        strikeToken = await newWeth(Admin);
        base = parseEther("200");
        quote = parseEther("1");
        expiry = "1690868800"; // May 30, 2020, 8PM UTC

        Primitive = await newPrimitive(Admin, registry, underlyingToken, strikeToken, base, quote, expiry);

        optionToken = Primitive.optionToken;
        redeemToken = Primitive.redeemToken;
        flash = await newFlash(Admin, optionToken.address);
    });
    describe(" Flash", () => {
        it("execute a flash loan that returns the outTokenU", async () => {
            // mint some options so the underlyingCache is > 0
            let inTokenU = ONE_ETHER;
            let flashFee = inTokenU.div(1000).mul(quote).div(base);
            await underlyingToken.transfer(optionToken.address, inTokenU);
            await optionToken.mint(Alice);
            if ((await strikeToken.symbol()) == "WETH") await strikeToken.deposit({ value: flashFee });
            await strikeToken.transfer(flash.address, flashFee);
            await flash.goodFlashLoan(ONE_ETHER);

            expect((await optionToken.strikeCache()).toString()).to.be.eq(flashFee.toString());
        });
        it("should revert because the flash loan doesnt return the capital", async () => {
            // mint some options so the underlyingCache is > 0
            await underlyingToken.transfer(optionToken.address, ONE_ETHER);
            await optionToken.mint(Alice);
            await expect(flash.badFlashLoan(ONE_ETHER)).to.be.revertedWith(ERR_ZERO);
        });
    });
});
