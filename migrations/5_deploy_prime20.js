const Options = artifacts.require('Options');
const tUSD = artifacts.require("tUSD");
const PrimeERC20 = artifacts.require('PrimeERC20.sol');
const PoolERC20 = artifacts.require('PoolERC20.sol');
const RPulp = artifacts.require('RPulp.sol');
const ExchangeERC20 = artifacts.require('ExchangeERC20.sol');

// FIX - This should use factories for Exchange and RPulp

module.exports = async (deployer, network) => {
    const rinkebyCompoundAddress = '0xd6801a1dffcd0a410336ef88def4320d6df1883e';
    const mainnetCompoundAddress = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    
    const _tUSD = await tUSD.deployed();
    let collateralAmount = await web3.utils.toWei('1');
    let strikeAmount = await web3.utils.toWei('10');
    let strike = _tUSD.address;
    let expiry = '1607775120';
    let isCall = true;
    let name = 'ETH201212C150TUSD'

    // deploys new Prime ERC-20
    const options = await Options.deployed();
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
    await deployer.deploy(ExchangeERC20, prime20Address);
    const exchange20 = await ExchangeERC20.deployed();
    if(network == 'rinkeby') {
        await deployer.deploy(PoolERC20, prime20Address,  rinkebyCompoundAddress, exchange20.address);
    } else {
        await deployer.deploy(PoolERC20, prime20Address,  mainnetCompoundAddress, exchange20.address);
    }

    const prime20 = await PrimeERC20.at(prime20Address);
    console.log('[NAME]: ', await prime20.name());
    if(isCall) {
        let name = "Call Primitive Underlying LP";
        let symbol = "cPulp";
        await deployer.deploy(RPulp, name, symbol, isCall);
        const cPulp = await RPulp.deployed();
        await cPulp.setValid(prime20Address);
        await options.setRPulp(cPulp.address);
        await options.setPool(exchange20.address);
    } else {
        let name = "Put Primitive Underlying LP";
        let symbol = "pPulp";
        await deployer.deploy(RPulp, name, symbol, isCall);
        const pPulp = await RPulp.deployed();
        await pPulp.setValid(prime20Address);
        await options.setRPulp(pPulp.address);
        await options.setPool(exchange20.address);
    }
    

};
