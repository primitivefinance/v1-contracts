const bre = require("@nomiclabs/buidler/config");
const Registry = require("@primitivefi/contracts/deployments/rinkeby/Registry");
const { CONTRACT_NAMES } = require("@primitivefi/contracts/test/lib/constants");
const { REGISTRY } = CONTRACT_NAMES;

async function main() {
    await run("verify-contract", {
        contractName: REGISTRY,
        address: Registry.address,
        constructorArguments: [],
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
