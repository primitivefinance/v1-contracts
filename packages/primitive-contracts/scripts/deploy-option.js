const bre = require("@nomiclabs/buidler/config");
const {
    setupRinkeby,
    setupTokens,
    setupRegistry,
    checkSupported,
} = require("@primitivefi/contracts/tasks/lib/setup");
const { parseEther } = require("ethers/lib/utils");
const { checkInitialization } = require("../tasks/lib/utils");

async function main() {
    const { Alice } = await setupRinkeby();
    const { registry, optionFactory, redeemFactory } = await setupRegistry();
    const { usdcToken, ethToken } = await setupTokens();
    const base = parseEther("1");
    const quote = parseEther("1000");
    const expiry = "1609286400";
    await checkSupported(registry, ethToken, usdcToken);
    await checkInitialization(registry, optionFactory, redeemFactory);
    await registry.deployOption(
        ethToken.address,
        usdcToken.address,
        base,
        quote,
        expiry,
        { gasLimit: 1000000 }
    );
    const deployedOption = await registry.getOption(
        ethToken.address,
        usdcToken.address,
        base,
        quote,
        expiry
    );
    console.log(bre);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
