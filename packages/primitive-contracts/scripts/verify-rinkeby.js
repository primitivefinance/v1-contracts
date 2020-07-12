const bre = require("@nomiclabs/buidler");
const Registry = require("@primitivefi/contracts/deployments/rinkeby/Registry");
const {
    CONTRACT_NAMES,
    LIBRARIES,
} = require("@primitivefi/contracts/test/lib/constants");
const {
    REGISTRY,
    TRADER,
    OPTION_FACTORY,
    REDEEM_FACTORY,
    OPTION,
    REDEEM,
} = CONTRACT_NAMES;
const { OPTION_TEMPLATE_LIB, REDEEM_TEMPLATE_LIB } = LIBRARIES;
const { verifyContract } = require("./lib/utils");
const Trader = require("@primitivefi/contracts/deployments/rinkeby/Trader");
const OptionFactory = require("@primitivefi/contracts/deployments/rinkeby/OptionFactory");
const RedeemFactory = require("@primitivefi/contracts/deployments/rinkeby/RedeemFactory");
const OptionTemplateLib = require("@primitivefi/contracts/deployments/rinkeby/OptionTemplateLib");
const RedeemTemplateLib = require("@primitivefi/contracts/deployments/rinkeby/RedeemTemplateLib");
const { getContractAt } = bre.ethers;

const verifyRegistry = async () => {
    try {
        await verifyContract(REGISTRY, Registry.address, Registry.args, {});
    } catch (err) {
        console.error(err);
    }
};

const verifyFactories = async () => {
    try {
        await verifyContract(
            OPTION_FACTORY,
            OptionFactory.address,
            OptionFactory.args,
            { OptionTemplateLib: OptionTemplateLib.address }
        );
    } catch (err) {
        console.error(err);
    }

    try {
        await verifyContract(
            REDEEM_FACTORY,
            RedeemFactory.address,
            RedeemFactory.args,
            { [REDEEM_TEMPLATE_LIB]: RedeemTemplateLib.address.toString() }
        );
    } catch (err) {
        console.error(err);
    }
};

const verifyTraders = async () => {
    try {
        await verifyContract(TRADER, Trader.address, Trader.args, {});
    } catch (err) {
        console.error(err);
    }
};

const verifyTemplates = async () => {
    const optionFactory = await getContractAt(
        OptionFactory.abi,
        OptionFactory.address
    );
    const redeemFactory = await getContractAt(
        RedeemFactory.abi,
        RedeemFactory.address
    );
    // warning: deploys templates which costs gas.
    const { optionTemplate, redeemTemplate } = await checkTemplates(
        optionFactory,
        redeemFactory
    );
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
    // Verify registry, factories, traders, and templates.
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
