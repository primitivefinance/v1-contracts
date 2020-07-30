const bre = require("@nomiclabs/buidler");
//const Registry = require("@primitivefi/contracts/deployments/rinkeby/Registry");
const { CONTRACT_NAMES, LIBRARIES } = require("@primitivefi/contracts/test/lib/constants");
const { REGISTRY, TRADER, OPTION_FACTORY, REDEEM_FACTORY, OPTION, REDEEM, UNISWAP_TRADER } = CONTRACT_NAMES;
const { OPTION_TEMPLATE_LIB, REDEEM_TEMPLATE_LIB } = LIBRARIES;
const { checkTemplates } = require("../tasks/lib/setup");
const { verifyContract } = require("./lib/utils");
const { getContractAt } = bre.ethers;

const verifyRegistry = async () => {
    let Registry = await deployments.get("Registry");
    try {
        await verifyContract(REGISTRY, Registry.address, Registry.args, {});
    } catch (err) {
        console.error(err);
    }
};

const verifyFactories = async () => {
    let OptionFactory = await deployments.get("OptionFactory");
    let OptionTemplateLib = await deployments.get("OptionTemplateLib");
    try {
        await verifyContract(OPTION_FACTORY, OptionFactory.address, OptionFactory.args, {
            [OPTION_TEMPLATE_LIB]: OptionTemplateLib.address,
        });
    } catch (err) {
        console.error(err);
    }

    let RedeemFactory = await deployments.get("RedeemFactory");
    let RedeemTemplateLib = await deployments.get("RedeemTemplateLib");

    try {
        await verifyContract(REDEEM_FACTORY, RedeemFactory.address, RedeemFactory.args, {
            [REDEEM_TEMPLATE_LIB]: RedeemTemplateLib.address,
        });
    } catch (err) {
        console.error(err);
    }
};

const verifyTraders = async () => {
    let Trader = await deployments.get("Trader");
    let UniswapTrader = await deployments.get("UniswapTrader");
    try {
        await verifyContract(TRADER, Trader.address, Trader.args, {});
        await verifyContract(UNISWAP_TRADER, UniswapTrader.address, UniswapTrader.args, {});
    } catch (err) {
        console.error(err);
    }
};

const verifyTemplates = async () => {
    let OptionFactory = await deployments.get("OptionFactory");
    let RedeemFactory = await deployments.get("RedeemFactory");
    const optionFactory = await getContractAt(OptionFactory.abi, OptionFactory.address);
    const redeemFactory = await getContractAt(RedeemFactory.abi, RedeemFactory.address);
    // warning: deploys templates which costs gas.
    const { optionTemplate, redeemTemplate } = await checkTemplates(optionFactory, redeemFactory);
    try {
        await verifyContract(OPTION, optionTemplate, [], {});
    } catch (err) {
        console.error(err);
    }
    try {
        await verifyContract(REDEEM, redeemTemplate, [], {});
    } catch (err) {
        console.error(err);
    }
};

async function main() {
    await verifyFactories();
    await verifyRegistry();
    await verifyTraders();
    await verifyTemplates();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
