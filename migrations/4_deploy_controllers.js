const ControllerOption = artifacts.require('ControllerOption');
const ControllerMarket = artifacts.require('ControllerMarket');
const ControllerExchange = artifacts.require('ControllerExchange');
const ControllerPool = artifacts.require('ControllerPool');
const ControllerRedeem = artifacts.require('ControllerRedeem');
const ControllerPerpetual = artifacts.require('ControllerPerpetual');
const Prime = artifacts.require('Prime');
const tUSD = artifacts.require("tUSD");

module.exports = async (deployer, network) => {
    const rinkebyCompoundAddress = '0xd6801a1dffcd0a410336ef88def4320d6df1883e';
    const mainnetCompoundAddress = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    const mainnetCompoundDai = '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643';
    const rinkebyCompoundDai = '0x6d7f0754ffeb405d23c51ce938289d4835be3b14';
    let compound;
    let compoundDai;
    if (network === 'rinkeby') {
        compound = rinkebyCompoundAddress;
        compoundDai = rinkebyCompoundDai;
    } else {
        compound = mainnetCompoundAddress;
        compoundDai = mainnetCompoundDai;
    }

    // Deploy Controllers
    await deployer.deploy(ControllerMarket);
    const controller = await ControllerMarket.deployed();
    const exchange = await deployer.deploy(ControllerExchange, controller.address);
    const pool = await deployer.deploy(ControllerPool, controller.address);
    const perpetual = await deployer.deploy(ControllerPerpetual, controller.address);
    const redeem = await deployer.deploy(ControllerRedeem, controller.address);

    // Deploy Option Controller
    const prime = await Prime.deployed();
    await deployer.deploy(ControllerOption, controller.address, prime.address);
    const option = await ControllerOption.deployed();
    await prime.setInstrumentController(option.address);

    // Initialize Controller Address to Main Controller
    await controller.initControllers(
        exchange.address,
        option.address,
        pool.address,
        perpetual.address,
        redeem.address
    );

    // Initialize New Maker Pool Contract with Compound Address
    await controller.initMakerPool(compound);

    // Initialize New Perpetual Contract with Compound Address
    await controller.initPerpetualPool(compoundDai);

    // Initialize Prime Redeem Token
    await controller.initPrimeRedeem();
    
    // Get the Option Parameters
    let _strike = await tUSD.deployed();
    let qUnderlying = await web3.utils.toWei('0.1');
    let qStrike = await web3.utils.toWei('1');
    let aStrike = _strike.address;
    let tExpiry = '1587607322'
    let isEthCall = true;
    let ethCallName = 'ETH201212C150TUSD'

    // Create a new Eth Option Market
    /* await controller.createMarket(
        qUnderlying,
        qStrike,
        aStrike,
        tExpiry,
        isEthCall,
        ethCallName
    ); */
};
