const Prime = artifacts.require("Prime");
const tETH = artifacts.require('tETH');
const tUSD = artifacts.require('tUSD');
const Exchange = artifacts.require('Exchange');
const million = (10**20).toString();

module.exports = async (deployer,accounts) => {
    let prime = await Prime.deployed();
    console.log(prime.address)
    await deployer.deploy(Exchange, prime.address);
};
