const Underlying = artifacts.require("Underlying");
const Strike = artifacts.require("Strike");
const Call = artifacts.require("Call");
const OCall = artifacts.require("OCall");

const supply = (10**20).toString();

module.exports = async (deployer,accounts) => {
  deployer.deploy(Underlying, "Underlying", "U", 18, supply);
  deployer.deploy(Strike, "Strike", "S", 18, supply);
  deployer.deploy(Call);
  deployer.deploy(OCall, "Call Option Contract NFT", "OCNFT");
};
