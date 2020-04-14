const ControllerOption = artifacts.require('ControllerOption');
const ControllerMarket = artifacts.require('ControllerMarket');
const ControllerExchange = artifacts.require('ControllerExchange');
const ControllerPool = artifacts.require('ControllerPool');
const ControllerRedeem = artifacts.require('ControllerRedeem');
const Prime = artifacts.require('Prime');

module.exports = async (deployer) => {
    const prime = await Prime.deployed();
    await deployer.deploy(ControllerOption, prime.address);
    const controllerOption = await ControllerOption.deployed();
    await prime.setInstrumentController(controllerOption.address);
    await deployer.deploy(ControllerMarket);
    let controller = await ControllerMarket.deployed();
    await deployer.deploy(ControllerExchange, controller.address);
    await deployer.deploy(ControllerPool, controller.address);
    await deployer.deploy(ControllerRedeem, controller.address);
};
