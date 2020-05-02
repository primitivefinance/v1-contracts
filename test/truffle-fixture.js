const Dai = artifacts.require("DAI");

module.exports = async () => {
  const dai = await Dai.new();
  Dai.setAsDeployed(dai);
}
