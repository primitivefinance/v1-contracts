// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const { ADDRESSES } = require("../test/lib/constants");
const { UNI_FACTORY, UNI_ROUTER02 } = ADDRESSES;

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chain = await bre.getChainId();

    const trader = await deployments.get("Trader");

    const uniswapConnector = await deploy("UniswapConnector02", {
        from: deployer,
        contractName: "UniswapConnector02",
        args: [UNI_ROUTER02, UNI_FACTORY, trader.address],
    });

    let deployed = [uniswapConnector];
    for (let i = 0; i < deployed.length; i++) {
        if (deployed[i].newlyDeployed)
            log(
                `Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`
            );
    }
};

module.exports.tags = ["Periphery"];
