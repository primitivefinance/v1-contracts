const utils = require("./lib/utils");
const setup = require("./lib/setup");
const { newERC20, newWallets } = setup;

describe("A meta test file to test the test suite", () => {
    // ACCOUNTS
    let signers, Admin, User, Alice, Bob;

    before(async () => {
        signers = await newWallets();
        Admin = signers[0];
        User = signers[1];
        Alice = Admin._address;
        Bob = User._address;
    });

    describe("Constructor", () => {
        it("should get an erc20 contract instance", async () => {
            const erc20 = await newERC20(Admin, "Test ERC20", "TEST", "100");
            console.log(erc20.address);
        });
    });
});
