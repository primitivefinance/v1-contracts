const Prime = artifacts.require('Prime');
const Exchange = artifacts.require('Exchange');
const Options = artifacts.require('Options');
const tETH = artifacts.require('tETH');
const Pool = artifacts.require('Pool');
const tUSD = artifacts.require("tUSD");
const PrimeERC20 = artifacts.require('PrimeERC20.sol');
const PoolERC20 = artifacts.require('PoolERC20.sol');
const RPulp = artifacts.require('RPulp.sol');
const ExchangePool = artifacts.require('ExchangePool.sol');

module.exports = async (deployer, accounts, network) => {
    const rinkebyCompoundAddress = '0xd6801a1dffcd0a410336ef88def4320d6df1883e';
    const mainnetCompoundAddress = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
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
    );

    let ePool = await ExchangePool.deployed();
    await deployer.deploy(
        PoolERC20,
        prime20.address,
        mainnetCompoundAddress,
        ePool.address
    );

    
    let rPulp = await RPulp.deployed();
    await rPulp.setValid(prime20.address);
    await prime20.setPulp(rPulp.address);
    await prime20.setPool(ePool.address);
};
