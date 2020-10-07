// Testing suite tools
const { expect } = require("chai");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

// Convert to wei
const { parseEther } = require("ethers/lib/utils");

// Helper functions and constants
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { ONE_ETHER, MILLION_ETHER } = constants.VALUES;
const { ERR_ZERO } = constants.ERR_CODES;

describe("ClearingHouse", () => {
    // Accounts
    let Admin, User, Alice;

    // Tokens
    let weth, dai, optionToken;

    // Option Parameters
    let underlyingToken, strikeToken, base, quote, expiry;

    // Periphery and Administrative contracts
    let registry, flash;

    before(async () => {
        let signers = await setup.newWallets();

        // Signers
        Admin = signers[0];
        User = signers[1];

        // Addresses of Signers
        Alice = Admin._address;
        Bob = User._address;

        // Underlying and quote token instances
        weth = await setup.newWeth(Admin);
        dai = await setup.newERC20(Admin, "TEST DAI", "DAI", MILLION_ETHER);

        // Administrative contract instances
        registry = await setup.newRegistry(Admin);

        // Option Parameters
        underlyingToken = dai;
        strikeToken = weth;
        base = parseEther("200").toString();
        quote = parseEther("1").toString();
        expiry = "1690868800";

        // Option and Redeem token instances for parameters
        Primitive = await setup.newPrimitive(
            Admin,
            registry,
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );

        optionToken = Primitive.optionToken;
        redeemToken = Primitive.redeemToken;
        flash = await setup.newFlash(Admin, optionToken.address);
    });

    describe("primitiveFlash", () => {
        it("execute a flash loan and return them", async () => {});
    });
});
