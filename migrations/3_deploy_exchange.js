const Prime = artifacts.require("Prime");
const tETH = artifacts.require('tETH');
const tUSD = artifacts.require('tUSD')
const million = (10**20).toString();

module.exports = async (deployer,accounts) => {
  deployer.deploy(Prime);
  deployer.deploy(tETH, million);
  deployer.deploy(tUSD, million);
};
