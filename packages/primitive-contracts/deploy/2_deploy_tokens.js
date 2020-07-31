// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const { parseEther } = require("ethers/lib/utils");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chain = await bre.getChainId();
    if (chainId == 4) {
        const ethToken = await deploy("TestERC20", {
            from: deployer,
            contractName: "TestERC20",
            args: ["ETH", "Ether", parseEther("10000")],
        });

        const usdcToken = await deploy("TestERC20", {
            from: deployer,
            contractName: "TestERC20",
            args: ["USDC", "Stablecoin", parseEther("10000")],
        });
        let deployed = [ethToken, usdcToken];
        for (let i = 0; i < deployed.length; i++) {
            if (deployed[i].newlyDeployed)
                log(
                    `Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`
                );
        }
    }
};
