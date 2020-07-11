const bre = require("@nomiclabs/buidler/config");
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
const Option = require("@primitivefi/contracts/artifacts/Option");
const Redeem = require("@primitivefi/contracts/artifacts/Redeem");
const Weth = require("canonical-weth");
const { ethers } = require("@nomiclabs/buidler");

async function main() {
    const rinkeby = new ethers.providers.InfuraProvider("rinkeby").connection
        .url;
    // verify registry, factories, trader, and implementations
    try {
        await verifyContract(REGISTRY, Registry.address, Registry.args, {});
    } catch (err) {
        console.log("continuing");
    }

    try {
        await verifyContract(
            OPTION_FACTORY,
            OptionFactory.address,
            OptionFactory.args,
            { OPTION_TEMPLATE_LIB: OptionTemplateLib.address }
        );
    } catch (err) {
        console.log("continuing");
    }

    await verifyContract(
        REDEEM_FACTORY,
        RedeemFactory.address,
        RedeemFactory.args,
        { REDEEM_TEMPLATE_LIB: RedeemTemplateLib.address }
    );
    await verifyContract(TRADER, Trader.address, Trader.args, {});
    const optionFactory = new ethers.Contract(
        OptionFactory.address,
        OptionFactory.abi,
        rinkeby
    );
    const optionTemplate = await optionFactory.optionTemplate();
    const redeemFactory = new ethers.Contract(
        RedeemFactory.address,
        RedeemFactory.abi,
        rinkeby
    );
    const redeemTemplate = await redeemFactory.redeemTemplate();
    await verifyContract(OPTION, optionTemplate, [], {});
    await verifyContract(REDEEM, redeemTemplate, [], {});
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
