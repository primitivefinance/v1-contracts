const Prime = artifacts.require("Prime");
module.exports = async (deployer) => {
  deployer.deploy(Prime);
};
