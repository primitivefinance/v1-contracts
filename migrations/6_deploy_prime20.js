const Prime = artifacts.require('Prime');
const Exchange = artifacts.require('Exchange');
const Options = artifacts.require('Options');
const tETH = artifacts.require('tETH');
const Pool = artifacts.require('Pool');
const tUSD = artifacts.require("tUSD");
const PrimeERC20 = artifacts.require('PrimeERC20.sol');
const RPulp = artifacts.require('RPulp.sol');
const ExchangePool = artifacts.require('ExchangePool.sol');

module.exports = async (deployer, accounts, network) => {
    let prime = await Prime.deployed();
    await deployer.deploy(
        RPulp
    );
    await deployer.deploy(
        PrimeERC20,
        prime.address
    );
    let prime20 = await PrimeERC20.deployed();
    await deployer.deploy(
        ExchangePool,
        prime20.address
    )

    
    let rPulp = await RPulp.deployed();
    await rPulp.setValid(prime20.address);
    await prime20.setPulp(rPulp.address);
};
