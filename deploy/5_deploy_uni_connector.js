// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const { ADDRESSES } = require("../test/lib/constants");
const { RINKEBY_UNI_ROUTER02, RINKEBY_UNI_FACTORY } = ADDRESSES;

module.exports = async ({ getNamedAccounts, deployments }) => {
    const [signer] = await ethers.getSigners();
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
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

    if (chain == 4) {
        const USDC = await deployments.get("USDC");
        const quoteTokenAddress = await uniswapInstance.quoteToken();
        if (quoteTokenAddress == bre.ethers.constants.AddressZero) {
            await uniswapInstance.setQuoteToken(USDC.address);
        }
        const uniswapAddresses = await uniswapInstance.getUniswapAddresses();
        const routerAddress = uniswapAddresses.router;
        const factoryAddress = uniswapAddresses.factory;
        if (
            routerAddress == bre.ethers.constants.AddressZero &&
            factoryAddress == bre.ethers.constants.AddressZero
        ) {
            await uniswapInstance.setUniswapProtocol(
                RINKEBY_UNI_ROUTER02,
                RINKEBY_UNI_FACTORY,
                true
            );
        }

        const primitiveAddresses = await uniswapInstance.getPrimitiveAddresses();
        const traderAddress = primitiveAddresses.trader;
        const registryAddress = primitiveAddresses.registry;
        if (
            traderAddress == bre.ethers.constants.AddressZero &&
            registryAddress == bre.ethers.constants.AddressZero
        ) {
            await uniswapInstance.setPrimitiveProtocol(
                trader.address,
                registry.address,
                true
            );
        }
    }

    let deployed = [uniswapConnector];
    for (let i = 0; i < deployed.length; i++) {
        if (deployed[i].newlyDeployed)
            log(
                `Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`
            );
    }
};
