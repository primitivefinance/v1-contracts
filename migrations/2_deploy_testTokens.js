const tETH = artifacts.require('tETH');
const tUSD = artifacts.require('tUSD')
const million = (10**20).toString();

module.exports = async (deployer) => {
  deployer.deploy(tETH, million);
  deployer.deploy(tUSD, million);
};
