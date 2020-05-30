// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const PrimeOption = artifacts.require("PrimeOption");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const { web3 } = require("@nomiclabs/buidler");

async function main() {
    // Buidler always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await bre.run('compile');

    const rinkebyWeth = "0xc778417e063141139fce010982780140aa0cd5ab";
    const mainnetWeth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    const mainnetDAI = "0x6b175474e89094c44da98b954eedeac495271d0f";

    let weth;
    if (network === "rinkeby") {
        weth = rinkebyWeth;
    } else {
        weth = mainnetWeth;
    }

    const tokenU = weth;
    const tokenS = mainnetDAI;
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
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
