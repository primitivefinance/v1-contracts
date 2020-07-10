// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const { LIBRARIES } = require("@primitivefi/contracts/test/lib/constants");
const { OPTION_TEMPLATE_LIB, REDEEM_TEMPLATE_LIB } = LIBRARIES;

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chain = await bre.getChainId();
    const optionTemplateLib = await deploy("OptionTemplateLib", {
        from: deployer,
        contractName: "OptionTemplateLib",
        args: [],
    });
    const redeemTemplateLib = await deploy("RedeemTemplateLib", {
        from: deployer,
        contractName: "RedeemTemplateLib",
        args: [],
    });

    const registry = await deploy("Registry", {
        from: deployer,
        contractName: "Registry",
        args: [],
    });

    let optionFactory = await deploy("OptionFactory", {
        from: deployer,
        contractName: "OptionFactory",
        args: [registry.address],
        libraries: {
            ["OptionTemplateLib"]: optionTemplateLib.address,
        },
    });

    let redeemFactory = await deploy("RedeemFactory", {
        from: deployer,
        contractName: "RedeemFactory",
        args: [registry.address],
        libraries: {
            ["RedeemTemplateLib"]: redeemTemplateLib.address,
        },
    });

    let deployed = [registry, optionFactory, redeemFactory];
    for (let i = 0; i < deployed.length; i++) {
        if (deployed[i].newlyDeployed)
            log(
                `Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`
            );
    }
};
