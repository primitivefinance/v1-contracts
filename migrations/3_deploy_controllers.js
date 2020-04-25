const ControllerOption = artifacts.require('ControllerOption');
const ControllerMarket = artifacts.require('ControllerMarket');
const ControllerPool = artifacts.require('ControllerPool');
const ControllerRedeem = artifacts.require('ControllerRedeem');

module.exports = async (deployer, network) => {
    const rinkebyCompoundAddress = '0xd6801a1dffcd0a410336ef88def4320d6df1883e';
    const mainnetCompoundAddress = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    const mainnetCompoundDai = '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643';
    const rinkebyCompoundDai = '0x6d7f0754ffeb405d23c51ce938289d4835be3b14';
    const mainnetChainlink = '0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9';
    const rinkebyChainlink = '0x0bF4e7bf3e1f6D6Dc29AA516A33134985cC3A5aA';
    const rinkebyWeth = '0xc778417e063141139fce010982780140aa0cd5ab';
    const mainnetWeth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

    let compound;
    let compoundDai;
    let oracle;
    let weth;
    if (network === 'rinkeby') {
        compound = rinkebyCompoundAddress;
        compoundDai = rinkebyCompoundDai;
        oracle = rinkebyChainlink;
        weth = rinkebyWeth;
    } else {
        compound = mainnetCompoundAddress;
        compoundDai = mainnetCompoundDai;
        oracle = mainnetChainlink;
        weth = mainnetWeth;
    }

    // Deploy Controllers
    await deployer.deploy(ControllerMarket);
    const controller = await ControllerMarket.deployed();
    const pool = await deployer.deploy(ControllerPool, controller.address, weth);
    const redeem = await deployer.deploy(ControllerRedeem, controller.address);

    await deployer.deploy(ControllerOption, controller.address);
    const option = await ControllerOption.deployed();

    // Initialize Controller Address to Main Controller
    await controller.initControllers(
        option.address,
        pool.address,
        redeem.address
    );

    // Initialize New Maker Pool Contract with Compound Address
    /* await controller.initMakerPool(compoundDai, oracle); */
};
