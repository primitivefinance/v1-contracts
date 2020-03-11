const tETH = artifacts.require('tETH');
const tUSD = artifacts.require('tUSD')

let million = (10**20).toString();

module.exports = async (deployer,accounts) => {
  deployer.deploy(tETH, "Testnet ETH", 'tETH', 18, million);
  deployer.deploy(tUSD, "Testnet USD", 'tUSD', 18, million);
};
