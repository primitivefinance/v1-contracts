const bre = require("@nomiclabs/buidler/config");
const mnemonic = process.env.TEST_MNEMONIC;
const { ethers } = require("ethers");
const { AddressZero } = ethers.constants;
const { parseEther } = ethers.utils;
const { InfuraProvider } = ethers.providers;
const { checkInitialization } = require("./utils");
const Registry = require("@primitivefi/contracts/artifacts/Registry.json");
const OptionFactory = require("@primitivefi/contracts/artifacts/OptionFactory.json");
const RedeemFactory = require("@primitivefi/contracts/artifacts/RedeemFactory.json");
const TestERC20 = require("@primitivefi/contracts/artifacts/TestERC20.json");
const Option = require("@primitivefi/contracts/artifacts/Option.json");
const Redeem = require("@primitivefi/contracts/artifacts/Redeem.json");

async function setupRinkeby() {
    // get provider
    const provider = new InfuraProvider("rinkeby");
    // create a wallet
    const wallet = new ethers.Wallet.fromMnemonic(mnemonic);
    // connect wallet to provider
    const Alice = await wallet.connect(provider);

    return { provider, Alice };
}

async function setupRegistry() {
    const { Alice } = await setupRinkeby();
    let registry = await deployments.get("Registry");
    registry = new ethers.Contract(registry.address, registry.abi, Alice);
    let optionFactory = await deployments.get("OptionFactory");
    optionFactory = new ethers.Contract(
        optionFactory.address,
        optionFactory.abi,
        Alice
    );
    let redeemFactory = await deployments.get("RedeemFactory");
    redeemFactory = new ethers.Contract(
        redeemFactory.address,
        redeemFactory.abi,
        Alice
    );
    await checkInitialization(registry, optionFactory, redeemFactory);
    if ((await optionFactory.optionTemplate()) == ethers.AddressZero) {
        await optionFactory.deployOptionTemplate();
    }
    if ((await redeemFactory.redeemTemplate()) == ethers.AddressZero) {
        await redeemFactory.deployRedeemTemplate();
    }
    return { registry, optionFactory, redeemFactory };
}

async function setupTokens() {
    const { Alice } = await setupRinkeby();
    let ethToken = await deployments.get("ETH");
    ethToken = new ethers.Contract(ethToken.address, ethToken.abi, Alice);
    let usdcToken = await deployments.get("USDC");
    usdcToken = new ethers.Contract(usdcToken.address, usdcToken.abi, Alice);
    return { ethToken, usdcToken };
}

async function setupPrimitive() {
    const { Alice, provider } = await setupRinkeby();
    const { deployIfDifferent, log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    let registry = await deployments.get("Registry");
    registry = new ethers.Contract(
        registry.address,
        registry.abi,
        provider
    ).connect(Alice);
    let optionFactory = await deployments.get("OptionFactory");
    optionFactory = new ethers.Contract(
        optionFactory.address,
        optionFactory.abi,
        Alice
    );
    let redeemFactory = await deployments.get("RedeemFactory");
    redeemFactory = new ethers.Contract(
        redeemFactory.address,
        redeemFactory.abi,
        Alice
    );
    console.log(await registry.redeemFactory());
    await checkInitialization(registry, optionFactory, redeemFactory);
    let trader = await deployments.get("Trader");
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
    const option = new ethers.Contract(optionAddress, Option.abi, Alice);
    const redeem = new ethers.Contract(
        await option.redeemToken(),
        Redeem.abi,
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

async function checkSupported(registry, underlyingToken, strikeToken) {
    const isUnderlyingSupported = await registry.isSupported(
        underlyingToken.address
    );
    const isStrikeSupported = await registry.isSupported(strikeToken.address);
    if (!isUnderlyingSupported) {
        await registry.addSupported(underlyingToken.address);
    }
    if (!isStrikeSupported) {
        await registry.addSupported(strikeToken.address);
    }
}

module.exports = {
    setupRinkeby,
    setupPrimitive,
    setupTest,
    setupTokens,
    setupRegistry,
    checkSupported,
};
