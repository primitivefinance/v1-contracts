const Dai = artifacts.require("DAI");

module.exports = async () => {
    const dai = await Dai.new(1000);
    Dai.setAsDeployed(dai);
    console.log('Truffle fixture deployed!')
}
