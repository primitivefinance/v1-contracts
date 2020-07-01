const bre = require("@nomiclabs/buidler/config");
const { setupRinkeby, setupPrimitive, setupTest } = require("./lib/setup");
const { parseEther } = require("ethers/utils");
const { checkAllowance } = require("./lib/utils");

task("trader:mint", "Mints options")
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

task("trader:exercise", "Mints options")
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

task("trader:redeem", "Mints options")
    .addParam("amount", "The amount of options to buy")
    .setAction(async function(taskArgs) {
        const { Alice } = await setupRinkeby();
        const { redeem, option, trader } = await setupPrimitive();
        const amount = parseEther(taskArgs.amount.toString());
        await checkAllowance(Alice, trader, redeem);
        try {
            await trader.safeRedeem(option.address, amount, Alice.address, {
                from: Alice.address,
                gasLimit: 1000000,
            });
        } catch (err) {
            console.log(err);
        }

        console.log((await option.balanceOf(Alice.address)).toString());
    });

task("trader:close", "Mints options")
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
