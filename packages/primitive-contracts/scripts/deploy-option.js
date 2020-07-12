const bre = require("@nomiclabs/buidler/config");
const {
    setupRinkeby,
    setupTokens,
    setupRegistry,
    checkSupported,
} = require("@primitivefi/contracts/tasks/lib/setup");
const { parseEther } = require("ethers/lib/utils");
const { checkInitialization } = require("../tasks/lib/utils");

const deployOption = async () => {
    const { registry, optionFactory, redeemFactory } = await setupRegistry();
    const { usdcToken, ethToken } = await setupTokens();
    const base = parseEther("1");
    const quote = parseEther("1000");
    const expiry = "1609286400";
    await checkSupported(registry, ethToken, usdcToken);
    await checkInitialization(registry, optionFactory, redeemFactory);
    const tx = await registry.deployOption(
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

    return { tx, deployedOption };
};

async function main() {
    await deployOption();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
