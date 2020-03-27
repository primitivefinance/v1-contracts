const Prime = artifacts.require('Prime');
const Exchange = artifacts.require('Exchange');
const Options = artifacts.require('Options');
const tETH = artifacts.require('tETH');
const Pool = artifacts.require('Pool');

module.exports = async (deployer, accounts) => {
    const compoundEthAddress = '0xd6801a1dffcd0a410336ef88def4320d6df1883e'
    let prime = await Prime.deployed();
    let exchange = await Exchange.deployed();
    await deployer.deploy(
        Pool,
        prime.address,
        compoundEthAddress,
        exchange.address
    );

    let pool = await Pool.deployed();
    
    /* Sets pool address */
    await prime.setPoolAddress(pool.address);
    await exchange.setPoolAddress(pool.address);
    /* Allows all tokens to be transferred to pool without approval */
    await prime.setApprovalForAll(pool.address, true);

};
