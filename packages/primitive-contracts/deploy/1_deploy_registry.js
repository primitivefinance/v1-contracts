// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chain = await bre.getChainId();
    const registry = await deploy("Registry", {
        from: deployer,
        contractName: "Registry",
        args: [],
    });
    const factory = await deploy("Factory", {
        from: deployer,
        contractName: "Factory",
        args: [registry.address],
    });

    const factoryRedeem = await deploy("FactoryRedeem", {
        from: deployer,
        contractName: "FactoryRedeem",
        args: [registry.address],
    });
    let deployed = [registry, factory, factoryRedeem];
    for (let i = 0; i < deployed.length; i++) {
        if (deployed[i].newlyDeployed)
            log(
                `Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`
            );
    }
};
