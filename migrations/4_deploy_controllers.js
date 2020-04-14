const ControllerOption = artifacts.require('ControllerOption');
const ControllerMarket = artifacts.require('ControllerMarket');
const ControllerExchange = artifacts.require('ControllerExchange');
const ControllerPool = artifacts.require('ControllerPool');
const ControllerRedeem = artifacts.require('ControllerRedeem');
const Prime = artifacts.require('Prime');

module.exports = async (deployer, network) => {
    const rinkebyCompoundAddress = '0xd6801a1dffcd0a410336ef88def4320d6df1883e';
    const mainnetCompoundAddress = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    let compound;
    if (network === 'rinkeby') {
        compound = rinkebyCompoundAddress;
    } else {
        compound = mainnetCompoundAddress;
    }

    await deployer.deploy(ControllerMarket);
    const controller = await ControllerMarket.deployed();
    const exchange = await deployer.deploy(ControllerExchange, controller.address);
    const pool = await deployer.deploy(ControllerPool, controller.address);
    const redeem = await deployer.deploy(ControllerRedeem, controller.address);

    const prime = await Prime.deployed();
    await deployer.deploy(ControllerOption, controller.address, prime.address);
    const option = await ControllerOption.deployed();
    await prime.setInstrumentController(option.address);

    await controller.initControllers(
        exchange.address,
        option.address,
        pool.address,
        redeem.address
    );

    await controller.initMakerPool(compound);
    await controller.initPrimeRedeem();
};
