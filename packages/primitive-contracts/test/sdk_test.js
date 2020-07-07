const { Trader } = require("@primitivefi/sdk");

contract("Trader SDK Test", (accounts) => {
    // ACCOUNTS
    const Alice = accounts[0];
    const Bob = accounts[1];

    let trader, weth, dai, prime, redeem;
    let tokenU, tokenS;
    let base, quote, expiry;
    let factory, Primitive, registry;

    before(async () => {
        const trader = new Trader();
    });

    describe("Constructor", () => {
        it("should return the correct weth address", async () => {
            console.log(trader);
        });
    });
});
