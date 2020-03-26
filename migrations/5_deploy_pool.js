const Prime = artifacts.require('Prime');
const Options = artifacts.require('Options');
const tETH = artifacts.require('tETH');
const Pool = artifacts.require('Pool');

module.exports = async (deployer, accounts) => {
    const factoryAddress = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36'
    let prime = await Prime.deployed();
    await deployer.deploy(
        Pool,
        prime.address,
        factoryAddress
    );

    let pool = await Pool.deployed();
    await prime.setPoolAddress(pool.address);

};
