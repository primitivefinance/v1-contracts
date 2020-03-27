const Prime = artifacts.require('Prime');
const Exchange = artifacts.require('Exchange');
const Options = artifacts.require('Options');
const tETH = artifacts.require('tETH');
const Pool = artifacts.require('Pool');

module.exports = async (deployer, accounts) => {
    const factoryAddress = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36'
    let prime = await Prime.deployed();
    let exchange = await Exchange.deployed();
    await deployer.deploy(
        Pool,
        prime.address,
        factoryAddress,
        exchange.address
    );

    let pool = await Pool.deployed();
    
    /* Sets pool address */
    await prime.setPoolAddress(pool.address);
    await exchange.setPoolAddress(pool.address);
    /* Allows all tokens to be transferred to pool without approval */
    await prime.setApprovalForAll(pool.address, true);

};
