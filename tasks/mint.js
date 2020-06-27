const bre = require("@nomiclabs/buidler/config");
const { setupRinkeby, setupPrimitive, setupTest } = require("./setup");
const { parseEther } = require("ethers/utils");
const { checkAllowance } = require("./utils");

task("mint", "Mints options")
    .addParam("amount", "The amount of options to buy")
    .setAction(async function(taskArgs) {
        const { Alice } = await setupRinkeby();
        const { ethToken, option, trader } = await setupPrimitive();
        const amount = parseEther(taskArgs.amount.toString());
        console.log("checking allowance");
        await checkAllowance(Alice, trader, ethToken);
        console.log("minting");
        await trader.safeMint(option.address, amount, Alice.address, {
            from: Alice.address,
            gasLimit: 1000000,
        });
        console.log((await option.balanceOf(Alice.address)).toString());
    });

task("exercise", "Mints options")
    .addParam("amount", "The amount of options to buy")
    .setAction(async function(taskArgs) {
        const { Alice } = await setupRinkeby();
        const { usdcToken, option, trader } = await setupPrimitive();
        const amount = parseEther(taskArgs.amount.toString());
        await checkAllowance(Alice, trader, usdcToken);
        await checkAllowance(Alice, trader, option);
        await trader.safeExercise(option.address, amount, Alice.address, {
            from: Alice.address,
            gasLimit: 1000000,
        });
        console.log((await option.balanceOf(Alice.address)).toString());
    });

task("redeem", "Mints options")
    .addParam("amount", "The amount of options to buy")
    .setAction(async function(taskArgs) {
        const { Alice } = await setupRinkeby();
        const { redeem, option, trader } = await setupPrimitive();
        const amount = parseEther(taskArgs.amount.toString());
        await checkAllowance(Alice, trader, redeem);
        await trader.safeRedeem(option.address, amount, Alice.address, {
            from: Alice.address,
            gasLimit: 1000000,
        });
        console.log((await option.balanceOf(Alice.address)).toString());
    });

task("close", "Mints options")
    .addParam("amount", "The amount of options to buy")
    .setAction(async function(taskArgs) {
        const { Alice } = await setupRinkeby();
        const { redeem, option, trader } = await setupPrimitive();
        const amount = parseEther(taskArgs.amount.toString());
        await checkAllowance(Alice, trader, redeem);
        await checkAllowance(Alice, trader, option);
        await trader.safeClose(option.address, amount, Alice.address, {
            from: Alice.address,
            gasLimit: 1000000,
        });
        console.log((await option.balanceOf(Alice.address)).toString());
    });

task("setTest", "Mints options", async function() {
    const ETH = await setupTest();
});

module.exports = {};
