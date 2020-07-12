const bre = require("@nomiclabs/buidler");
const { getContractAt } = bre.ethers;
const mnemonic = process.env.TEST_MNEMONIC;
const { ethers } = require("ethers");
const { AddressZero } = ethers.constants;
const { parseEther } = ethers.utils;
const { InfuraProvider } = ethers.providers;
const { checkInitialization } = require("./utils");
const Option = require("@primitivefi/contracts/artifacts/Option");
const Redeem = require("@primitivefi/contracts/artifacts/Redeem");

async function setupRinkeby() {
    // get provider
    const provider = new InfuraProvider("rinkeby");
    // create a wallet
    const wallet = new ethers.Wallet.fromMnemonic(mnemonic);
    // connect wallet to provider
    const Alice = await wallet.connect(provider);

    return { provider, Alice };
}

/**
 * @dev Returns the registry and factory ethersjs Contract objects using the context of the bre.
 */
async function setupRegistry() {
    let registry = await deployments.get("Registry");
    let optionFactory = await deployments.get("OptionFactory");
    let redeemFactory = await deployments.get("RedeemFactory");
    registry = await getContractAt(registry.abi, registry.address);
    optionFactory = await getContractAt(
        optionFactory.abi,
        optionFactory.address
    );
    redeemFactory = await getContractAt(
        redeemFactory.abi,
        redeemFactory.address
    );
    await checkInitialization(registry, optionFactory, redeemFactory);
    await checkTemplates(optionFactory, redeemFactory);
    return { registry, optionFactory, redeemFactory };
}

async function checkTemplates(optionFactory, redeemFactory) {
    const optionTemplate = await optionFactory.optionTemplate();
    const redeemTemplate = await redeemFactory.redeemTemplate();
    if (optionTemplate.toString() == ethers.constants.AddressZero.toString()) {
        await optionFactory.deployOptionTemplate();
    }
    if (redeemTemplate.toString() == ethers.constants.AddressZero.toString()) {
        await redeemFactory.deployRedeemTemplate();
    }
    return { optionTemplate, redeemTemplate };
}

async function setupTokens() {
    let ethToken = await deployments.get("ETH");
    let usdcToken = await deployments.get("USDC");
    ethToken = await getContractAt(ethToken.abi, ethToken.address);
    usdcToken = await getContractAt(usdcToken.abi, usdcToken.address);
    return { ethToken, usdcToken };
}

async function setupTrader() {
    let trader = await deployments.get("Trader");
    trader = await getContractAt(trader.abi, trader.address);
    return { trader };
}

async function setupOption(optionAddress) {
    const option = await getContractAt(Option.abi, optionAddress);
    const redeem = await getContractAt(Redeem.abi, await option.redeemToken());
    return { option, redeem };
}

async function setupPrimitive() {
    const { trader } = await setupTrader();
    const { registry, optionFactory, redeemFactory } = await setupRegistry();
    const { ethToken, usdcToken } = await setupTokens();

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
            { gasLimit: 7000000 }
        );
        optionAddress = await registry.getOption(
            ethToken.address,
            usdcToken.address,
            base,
            quote,
            expiry
        );
    }

    const { option, redeem } = await setupOption(optionAddress);
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
    checkTemplates,
    setupRinkeby,
    setupPrimitive,
    setupOption,
    setupTrader,
    setupTest,
    setupTokens,
    setupRegistry,
    checkSupported,
};
