require("@nomiclabs/buidler/config");
const { setupRinkeby, setupPrimitive } = require("./lib/setup");
const { ethers } = require("ethers");
const TestERC20 = require("../artifacts/TestERC20.json");
const { internalTask } = require("@nomiclabs/buidler/config");

task("caches", "Gets the option caches").setAction(async function (taskArgs) {
    const { option } = await setupPrimitive();
    const underlyingCache = await option.underlyingCache();
    const strikeCache = await option.strikeCache();
    console.log("[Underlying Cache]: ", underlyingCache.toString());
    console.log("[Strike Cache]: ", strikeCache.toString());
});

task("option:underlying", "Gets the option caches").setAction(async function (
    taskArgs
) {
    const { Alice } = await setupRinkeby();
    const { option } = await setupPrimitive();
    const underlyingToken = await option.underlyingToken();
    const underlying = new ethers.Contract(
        underlyingToken,
        TestERC20.abi,
        Alice
    );
    console.log("[Underlying]: ", await underlying.name());
});

task("option:strike", "Gets the option caches").setAction(async function (
    taskArgs
) {
    const { Alice } = await setupRinkeby();
    const { option } = await setupPrimitive();
    const strikeToken = await option.strikeToken();
    const strike = new ethers.Contract(strikeToken, TestERC20.abi, Alice);
    console.log("[Strike]: ", await strike.name());
});

task("info", "Gets the options info").setAction(async function (taskArgs) {
    await run("caches");
    await run("totalSupply");
    await run("parameters");
});

internalTask("totalSupply", "Gets total supply of an option").setAction(
    async function (taskArgs) {
        const { option } = await setupPrimitive();
        const totalSupply = await option.totalSupply();
        console.log("[Total Supply]: ", totalSupply.toString());
    }
);

internalTask("parameters", "Gets the parameters of an option").setAction(
    async function (taskArgs) {
        const { option } = await setupPrimitive();
        const params = await option.getParameters();
        console.log("[Underlying]: ", params.underlyingToken.toString());
        console.log("[Strike]: ", params.strikeToken.toString());
        console.log("[Base]: ", params.base.toString());
        console.log("[Quote]: ", params.quote.toString());
        console.log("[Expiry]: ", params.expiry.toString());
    }
);

module.exports = {};
