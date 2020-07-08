const utils = require("./lib/utils");
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { toWei, assertBNEqual, verifyOptionInvariants } = utils;
const { newERC20, newWallets } = setup;
const { MockProvider } = require("ethereum-waffle");

describe("A meta test file to test the test suite", () => {
    // ACCOUNTS
    const wallets = newWallets();
    const Admin = wallets[0];
    const User = wallets[1];
    const Alice = Admin.address;
    const Bob = User.address;

    before(async () => {});

    describe("Constructor", () => {
        it("should get an erc20 contract instance", async () => {
            const erc20 = await newERC20(Admin, "Test ERC20", "TEST", "100");
            console.log(erc20.address);
        });
    });
});
