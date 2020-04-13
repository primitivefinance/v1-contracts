const Options = artifacts.require('Options');
const Prime = artifacts.require('Prime');

module.exports = async (deployer) => {
    const prime = await Prime.deployed();
    await deployer.deploy(Options, prime.address);
    const options = await Options.deployed();
    await prime.setInstrumentController(options.address);
};
