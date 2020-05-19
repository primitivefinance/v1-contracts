// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const PrimeOption = artifacts.require("PrimeOption");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const PrimeTrader = artifacts.require("PrimeTrader.sol");
const PrimePool = artifacts.require("PrimePool.sol");
const PrimeOracle = artifacts.require("PrimeOracle.sol");
const Dai = artifacts.require("DAI");
const Weth = artifacts.require("WETH9");
const { web3 } = require("@nomiclabs/buidler");

async function main() {
    // Buidler always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await bre.run('compile');

    const weth = await Weth.new();
    const dai = await Dai.new(web3.utils.toWei("1000000"));
    const trader = await PrimeTrader.new(weth.address);

    const tokenU = weth.address;
    const tokenS = dai.address;
    const marketId = 2;
    const optionName = "Primitive ETH Call 300 DAI Expiring June 26 2020";
    const optionSymbol = "primeETH300C260620";
    const redeemName = "Primitive Redeem for primeETH300C260620";
    const redeemSymbol = "redeemETH300C260620";
    const base = web3.utils.toWei("1");
    const price = web3.utils.toWei("300");
    const expiry = "1593129600"; // June 26, 2020, 0:00:00 UTC
    console.log({
        tokenU,
        tokenS,
        base,
        price,
        expiry,
    });

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

    const redeem = await PrimeRedeem.new(
        redeemName,
        redeemSymbol,
        prime.address,
        tokenS
    );

    await prime.initTokenR(redeem.address);
    console.log("[prime]", prime.address);
    console.log("[redeem]", redeem.address);
    console.log("[trader]", trader.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
