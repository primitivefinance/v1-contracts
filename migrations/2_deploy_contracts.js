const Underlying = artifacts.require("Underlying");
const Strike = artifacts.require("Strike");
const Prime = artifacts.require("Prime");
const Slate = artifacts.require("Slate");

const supply = (10**20).toString();

module.exports = async (deployer,accounts) => {
  deployer.deploy(Underlying, "Underlying", "U", 18, supply);
  deployer.deploy(Strike, "Strike", "S", 18, supply);
  deployer.deploy(Prime, "Prime Contract", "SP");
  deployer.deploy(Slate, "Slate NFT of Prime", "SP");
};
