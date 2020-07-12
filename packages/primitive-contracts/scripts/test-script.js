const bre = require("@nomiclabs/buidler");
const { setupRegistry, checkTemplates } = require("../tasks/lib/setup");

async function main() {
    /* console.log(await bre.ethers.provider.listAccounts()); */
    const { registry, optionFactory, redeemFactory } = await setupRegistry();
    console.log(await registry.optionFactory());
    await checkTemplates(optionFactory, redeemFactory);
    console.log(await optionFactory.optionTemplate());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
