const bre = require("@nomiclabs/buidler");
const { setupRegistry } = require("../tasks/lib/setup");

async function main() {
    /* console.log(await bre.ethers.provider.listAccounts()); */
    const { registry } = await setupRegistry();
    console.log(await registry.optionFactory());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
