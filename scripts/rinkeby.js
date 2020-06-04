// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const setup = require("../test/setup");
const constants = require("../test/constants");
const utils = require("../test/utils");
const { toWei } = utils;
const {
    newERC20,
    newWeth,
    newRegistry,
    newOptionFactory,
    newPrimitive,
} = setup;
const { MILLION_ETHER } = constants.VALUES;
const UniRouter = artifacts.require("UniRouter");
const PrimeTrader = artifacts.require("PrimeTrader.sol");
const PrimeOracle = artifacts.require("PrimeOracle");
const PrimeAMM = artifacts.require("PrimeAMM");
const { web3 } = require("@nomiclabs/buidler");

async function main() {
    // Buidler always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await bre.run('compile');

    const ORACLE = "0x0bF4e7bf3e1f6D6Dc29AA516A33134985cC3A5aA";

    // Setup tokens
    weth = await newERC20("TEST WETH", "WETH", MILLION_ETHER);
    dai = await newERC20("TEST DAI", "DAI", MILLION_ETHER);

    // Setup factories
    registry = await newRegistry();
    factoryOption = await newOptionFactory(registry);

    // Setup option parameters.
    tokenU = weth;
    tokenS = dai;
    base = toWei("1");
    price = toWei("300");
    expiry = "1593129600"; // June 26, 2020, 0:00:00 UTC

    // Call the deployOption function.
    Primitive = await newPrimitive(
        registry,
        tokenU,
        tokenS,
        base,
        price,
        expiry
    );

    // Setup option contract instances.
    prime = Primitive.prime;
    redeem = Primitive.redeem;

    // Setup extension contracts.
    trader = await PrimeTrader.new(weth.address);
    oracle = await PrimeOracle.new(ORACLE, weth.address);
    router = await UniRouter.new(dai.address, weth.address, oracle.address);

    // Seed router with liquidity.
    await dai.mint(router.address, toWei("1000"));
    await weth.mint(router.address, toWei("1000"));

    // Deploy a pool contract.
    pool = await PrimeAMM.new(
        weth.address,
        prime.address,
        oracle.address,
        registry.address,
        router.address
    );

    console.log("[prime]", prime.address);
    console.log("[redeem]", redeem.address);
    console.log("[trader]", trader.address);
    console.log("[pool]", pool.address);
    console.log("[oracle]", oracle.address);
    console.log("[router]", router.address);
    console.log("[registry]", registry.address);
    console.log("[factory]", factoryOption.address);
    console.log("[weth]", weth.address);
    console.log("[dai]", dai.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
