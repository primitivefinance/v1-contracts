const Underlying = artifacts.require("Underlying");
const Strike = artifacts.require("Strike");
const Prime = artifacts.require("Prime");
const OPrime = artifacts.require("TPrime");

const supply = (10**20).toString();

module.exports = async (deployer,accounts) => {
  deployer.deploy(Underlying, "Underlying", "U", 18, supply);
  deployer.deploy(Strike, "Strike", "S", 18, supply);
  deployer.deploy(Prime);
  deployer.deploy(OPrime, "Prime Option Contract NFT", "OCNFT");
};
