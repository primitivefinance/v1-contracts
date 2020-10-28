// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const { ADDRESSES } = require("../test/lib/constants");
const { UNI_FACTORY, UNI_ROUTER02 } = ADDRESSES;

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const signer = ethers.provider.getSigner(deployer);
    const chain = await bre.getChainId();
    const uniswapConnector = await deploy("UniswapConnector", {
        from: deployer,
        contractName: "UniswapConnector",
        args: [],
    });
    const uniswapInstance = new ethers.Contract(
        uniswapConnector.address,
        uniswapConnector.abi,
        signer
    );
    const registry = await deployments.get("Registry");
    const trader = await deployments.get("Trader");

    let STABLECOIN;
    if (chain == 1) {
        STABLECOIN = "0x6b175474e89094c44da98b954eedeac495271d0f"; // Mainnet Dai
    } else {
        let USDC = await deployments.get("USDC");
        STABLECOIN = USDC.address;
    }
    const quoteTokenAddress = await uniswapInstance.quoteToken();
    if (quoteTokenAddress == bre.ethers.constants.AddressZero) {
        await uniswapInstance.setQuoteToken(STABLECOIN);
    }
    const routerAddress = await uniswapInstance.router();
    const factoryAddress = await uniswapInstance.factory();
    if (
        routerAddress == bre.ethers.constants.AddressZero &&
        factoryAddress == bre.ethers.constants.AddressZero
    ) {
        await uniswapInstance.setRouter(UNI_ROUTER02);
        await uniswapInstance.setFactory(UNI_FACTORY);
    }

    const traderAddress = await uniswapInstance.trader();
    const registryAddress = await uniswapInstance.registry();
    if (
        traderAddress == bre.ethers.constants.AddressZero &&
        registryAddress == bre.ethers.constants.AddressZero
    ) {
        await uniswapInstance.setTrader(trader.address);
        await uniswapInstance.setRegistry(registry.address);
    }

    let deployed = [uniswapConnector];
    for (let i = 0; i < deployed.length; i++) {
        if (deployed[i].newlyDeployed)
            log(
                `Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`
            );
    }
};

module.exports.tags = ["Core"];
