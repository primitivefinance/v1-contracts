const bre = require("@nomiclabs/buidler/config");
const mnemonic = process.env.TEST_MNEMONIC;
const { ethers } = require("ethers");
const { AddressZero } = ethers.constants;
const { parseEther } = ethers.utils;
const { InfuraProvider } = ethers.providers;
const { checkInitialization } = require("./utils");
const Registry = require("../artifacts/Registry.json");
const Factory = require("../artifacts/Factory.json");
const FactoryRedeem = require("../artifacts/FactoryRedeem.json");
const TestERC20 = require("../artifacts/TestERC20.json");
const PrimeOption = require("../artifacts/PrimeOption.json");
const PrimeRedeem = require("../artifacts/PrimeRedeem.json");

async function setupRinkeby() {
    // get provider
    const provider = new InfuraProvider("rinkeby");
    // create a wallet
    const wallet = new ethers.Wallet.fromMnemonic(mnemonic);
    // connect wallet to provider
    const Alice = await wallet.connect(provider);

    return { provider, Alice };
}

async function setupPrimitive() {
    const { Alice } = await setupRinkeby();
    const { deployIfDifferent, log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    let registry = await deployments.get("Registry");
    registry = new ethers.Contract(registry.address, registry.abi, Alice);
    let factory = await deployments.get("Factory");
    factory = new ethers.Contract(factory.address, factory.abi, Alice);
    let factoryRedeem = await deployments.get("FactoryRedeem");
    factoryRedeem = new ethers.Contract(
        factoryRedeem.address,
        factoryRedeem.abi,
        Alice
    );
    await checkInitialization(registry, factory, factoryRedeem);
    let trader = await deployments.get("PrimeTrader");
    trader = new ethers.Contract(trader.address, trader.abi, Alice);
    let ethToken = await deployments.get("ETH");
    ethToken = new ethers.Contract(ethToken.address, ethToken.abi, Alice);
    let usdcToken = await deployments.get("USDC");
    usdcToken = new ethers.Contract(usdcToken.address, usdcToken.abi, Alice);

    const base = parseEther("1");
    const quote = parseEther("300");
    const expiry = "1790868800";
    let optionAddress = await registry.getOption(
        ethToken.address,
        usdcToken.address,
        base,
        quote,
        expiry
    );

    if (optionAddress == AddressZero) {
        let deployOption = await registry.deployOption(
            ethToken.address,
            usdcToken.address,
            base,
            quote,
            expiry,
            { from: Alice.address, gasLimit: 7000000 }
        );
        console.log(deployOption);
        optionAddress = await registry.getOption(
            ethToken.address,
            usdcToken.address,
            base,
            quote,
            expiry
        );
        console.log(optionAddress);
    }
    const option = new ethers.Contract(optionAddress, PrimeOption.abi, Alice);
    const redeem = new ethers.Contract(
        await option.tokenR(),
        PrimeRedeem.abi,
        Alice
    );
    return { ethToken, usdcToken, registry, option, redeem, trader };
}

async function setupTest(signer) {
    const { deployIfDifferent, log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const Token = await deployments.get("ETH");
    console.log(Token);
}

module.exports = {
    setupRinkeby,
    setupPrimitive,
    setupTest,
};
