const bre = require("@nomiclabs/buidler/config");
const { setupRinkeby, setupPrimitive, setupTest } = require("./lib/setup");
const { parseEther } = require("ethers/utils");
const { checkAllowance } = require("./lib/utils");
const { ethers } = require("ethers");
const TestERC20 = require("../artifacts/TestERC20.json");

task("caches", "Gets the option caches").setAction(async function(taskArgs) {
    const { Alice } = await setupRinkeby();
    const { option } = await setupPrimitive();
    const cacheU = await option.cacheU();
    const cacheS = await option.cacheS();
    console.log("[CacheU]: ", cacheU.toString());
    console.log("[CacheS]: ", cacheS.toString());
});

task("option:underlying", "Gets the option caches").setAction(async function(
    taskArgs
) {
    const { Alice } = await setupRinkeby();
    const { option } = await setupPrimitive();
    const tokenU = await option.tokenU();
    const underlying = new ethers.Contract(tokenU, TestERC20.abi, Alice);
    console.log("[Underlying]: ", await underlying.name());
});

task("option:strike", "Gets the option caches").setAction(async function(
    taskArgs
) {
    const { Alice } = await setupRinkeby();
    const { option } = await setupPrimitive();
    const tokenS = await option.tokenS();
    const strike = new ethers.Contract(tokenS, TestERC20.abi, Alice);
    console.log("[Strike]: ", await strike.name());
});

module.exports = {};
