const USDC = artifacts.require("USDC");
const DAI = artifacts.require("DAI");
const million = (10**20).toString();

module.exports = async (deployer) => {
  deployer.deploy(DAI, million);
  deployer.deploy(USDC, million);
};
