const ControllerOption = artifacts.require('ControllerOption');
const tUSD = artifacts.require("tUSD");
const PrimeOption = artifacts.require('PrimeOption.sol');
const PrimePool = artifacts.require('PrimePool.sol');
const PrimeRedeem = artifacts.require('PrimeRedeem.sol');
const PrimeExchange = artifacts.require('PrimeExchange.sol');

// FIX - This should use factories for Exchange and PrimeRedeem

module.exports = async (deployer, network) => {
    /* const rinkebyCompoundAddress = '0xd6801a1dffcd0a410336ef88def4320d6df1883e';
    const mainnetCompoundAddress = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    
    const _tUSD = await tUSD.deployed();
    let collateralAmount = await web3.utils.toWei('1');
    let strikeAmount = await web3.utils.toWei('10');
    let strike = _tUSD.address;
    let expiry = '1607775120';
    let isCall = true;
    let name = 'ETH201212C150TUSD'

    const options = await ControllerOption.deployed();
    await options.addEthOption(
        collateralAmount,
        strikeAmount,
        strike,
        expiry,
        isCall,
        name,
        {value: collateralAmount}
    );
    
    const nonce = await options._nonce();
    const prime20Address = await options._primeMarkets(nonce);
    await deployer.deploy(PrimeExchange, prime20Address);
    const exchange20 = await PrimeExchange.deployed();
    if(network == 'rinkeby') {
        await deployer.deploy(PrimePool, prime20Address,  rinkebyCompoundAddress);
    } else {
        await deployer.deploy(PrimePool, prime20Address,  mainnetCompoundAddress);
    }

    const prime20 = await PrimeOption.at(prime20Address);
    console.log('[NAME]: ', await prime20.name());
    if(isCall) {
        let name = "Call Primitive Underlying LP";
        let symbol = "cPulp";
        await deployer.deploy(PrimeRedeem, name, symbol, isCall);
        const cPulp = await PrimeRedeem.deployed();
        await cPulp.setValid(prime20Address);
        await options.setRPulp(cPulp.address);
        await options.setPool(exchange20.address);
    } else {
        let name = "Put Primitive Underlying LP";
        let symbol = "pPulp";
        await deployer.deploy(PrimeRedeem, name, symbol, isCall);
        const pPulp = await PrimeRedeem.deployed();
        await pPulp.setValid(prime20Address);
        await options.setRPulp(pPulp.address);
        await options.setPool(exchange20.address);
    } */
    

};
