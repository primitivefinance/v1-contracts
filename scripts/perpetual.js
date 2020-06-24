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
    newRegistry,
    newOptionFactory,
    newPrimitive,
    newInterestBearing,
    newPerpetual,
} = setup;
const { MILLION_ETHER } = constants.VALUES;
const PrimeTrader = artifacts.require("PrimeTrader.sol");

async function main() {
    // Buidler always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await bre.run('compile');

    // Setup tokens
    usdc = await newERC20("TEST USDC", "USDC", MILLION_ETHER);
    dai = await newERC20("TEST DAI", "DAI", MILLION_ETHER);
    let cusdc = await newInterestBearing(
        usdc.address,
        "Interest Bearing USDC",
        "cUSDC"
    );
    let cdai = await newInterestBearing(
        dai.address,
        "Interest Bearing DAI",
        "cDAI"
    );

    // Setup factories
    registry = await newRegistry();
    factoryOption = await newOptionFactory(registry);

    // Setup option parameters.
    tokenU = usdc;
    tokenS = dai;
    base = toWei("1");
    price = toWei("1");
    expiry = "7258118400";

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

    perpetual = await newPerpetual(
        cdai.address,
        cusdc.address,
        prime.address,
        Alice
    );

    // Setup extension contracts.
    trader = await PrimeTrader.new(weth.address);

    console.log("[prime]", prime.address);
    console.log("[redeem]", redeem.address);
    console.log("[trader]", trader.address);
    console.log("[perpetual]", perpetual.address);
    console.log("[registry]", registry.address);
    console.log("[factory]", factoryOption.address);
    console.log("[usdc]", usdc.address);
    console.log("[dai]", dai.address);
    console.log("[cusdc]", cusdc.address);
    console.log("[cdai]", cdai.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
