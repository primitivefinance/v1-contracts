// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const PrimeTrader = artifacts.require("PrimeTrader.sol");
const { web3 } = require("@nomiclabs/buidler");

async function main() {
    // Buidler always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await bre.run('compile');

    const rinkebyWeth = "0xc778417e063141139fce010982780140aa0cd5ab";
    const mainnetWeth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    const trader = await PrimeTrader.new(mainnetWeth);
    console.log("[TRADER]", trader.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
