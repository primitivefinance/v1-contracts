const bre = require("@nomiclabs/buidler/config");
const Trader = require("@primitivefi/contracts/deployments/rinkeby/Trader");
const { CONTRACT_NAMES } = require("@primitivefi/contracts/test/lib/constants");
const { TRADER } = CONTRACT_NAMES;
const Weth = require("canonical-weth");

async function main() {
    let wethAddress = Weth.networks["4"].address;
    await run("verify-contract", {
        contractName: TRADER,
        address: Trader.address,
        constructorArguments: [wethAddress],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
