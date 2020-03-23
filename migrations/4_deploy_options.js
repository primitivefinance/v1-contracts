const Exchange = artifacts.require('Exchange');
const Options = artifacts.require('Options');
const tETH = artifacts.require('tETH');
const million = (10**20).toString();

module.exports = async (deployer, accounts) => {
    let exchange = await Exchange.deployed();
    let tEth = await tETH.deployed();

    let collateralAmount = await web3.utils.toWei('1');
    let strikeAmount = await web3.utils.toWei('110');

    let collateralAsset = 'tETH';
    let strikeAsset = 'DAI';
    let expiration = '1600473585';
    let increment = '10';
    let collateralAddress = tETH.address;
    let strikeAddress = '0xc3dbf84Abb494ce5199D5d4D815b10EC29529ff8';
    let baseRatio = (strikeAmount / collateralAmount);

    await deployer.deploy(
        Options, exchange.address,
        expiration,
        increment,
        collateralAddress,
        strikeAddress,
        baseRatio
    );

    
    


    let options = await Options.deployed();

};
