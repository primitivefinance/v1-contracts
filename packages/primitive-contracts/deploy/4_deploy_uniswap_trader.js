// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");
const Weth = require("canonical-weth");
const { ADDRESSES } = require("../test/lib/constants");
const { RINKEBY_UNI_ROUTER02 } = ADDRESSES;

module.exports = async ({ getNamedAccounts, deployments }) => {
    const [signer] = await ethers.getSigners();
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chain = await bre.getChainId();
    const uniswapTrader = await deploy("UniswapTrader", {
        from: deployer,
        contractName: "UniswapTrader",
        args: [],
    });
    const uniswapInstance = new ethers.Contract(
        uniswapTrader.address,
        uniswapTrader.abi,
        signer
    );

    const USDC = await deployments.get("USDC");
    const quoteTokenAddress = await opFacInstance.optionTemplate();
    const routerAddress = await reFacInstance.redeemTemplate();
    if (quoteTokenAddress == bre.ethers.constants.AddressZero) {
        await uniswapInstance.setQuoteToken(USDC.address);
    }
    if (routerAddress == bre.ethers.constants.AddressZero) {
        await uniswapInstance.setRouter(RINKEBY_UNI_ROUTER02);
    }

    let deployed = [uniswapTrader];
    for (let i = 0; i < deployed.length; i++) {
        if (deployed[i].newlyDeployed)
            log(
                `Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`
            );
    }
};
