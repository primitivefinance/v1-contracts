const Prime = artifacts.require('Prime');
const Exchange = artifacts.require('Exchange');
const Options = artifacts.require('Options');
const tETH = artifacts.require('tETH');
const Pool = artifacts.require('Pool');
const tUSD = artifacts.require("tUSD");
const PrimeERC20 = artifacts.require('PrimeERC20.sol');
const PoolERC20 = artifacts.require('PoolERC20.sol');
const RPulp = artifacts.require('RPulp.sol');
const ExchangeERC20 = artifacts.require('ExchangeERC20.sol');

// FIX - This should use factories for Exchange and RPulp

module.exports = async (deployer, accounts, network) => {
    const rinkebyCompoundAddress = '0xd6801a1dffcd0a410336ef88def4320d6df1883e';
    const mainnetCompoundAddress = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    let prime = await Prime.deployed();
    await deployer.deploy(
        RPulp
    );
    await deployer.deploy(
        PrimeERC20,
        prime.address
    );
    /* let prime20 = await PrimeERC20.deployed(); */
    let options = await Options.deployed();
    await prime.setInstrumentController(options.address);
    let _tUSD = await tUSD.deployed();
    let _tETH = await tETH.deployed();
    let minter = accounts[0];
    console.log('[OPTIONS ADDRESS]', options.address);
    await _tETH.approve(options.address, '10000000000000000000');
    let collateralAmount = await web3.utils.toWei('1');
    let strikeAmount = await web3.utils.toWei('10');
    let collateral = _tETH.address;
    let strike = _tUSD.address;
    let expiry = '1607775120';
    let receiver = minter;
    let setPrime = await options.setPrimeAddress(prime.address);
    let isCall = true;
    await options.addEthOption(
        strikeAmount,
        strike,
        expiry,
        isCall,
        {value: collateralAmount}
    );
    
    let prime20Address = await options._primeMarkets(1);
    console.log('[PRIME20 ADDRESS]', prime20Address);
    await deployer.deploy(
        ExchangeERC20,
        prime20Address
    );

    let ePool = await ExchangeERC20.deployed();
    await deployer.deploy(
        PoolERC20,
        prime20Address,
        mainnetCompoundAddress,
        ePool.address
    );

    let prime20 = await PrimeERC20.at(prime20Address);
    let rPulp = await RPulp.deployed();
    await rPulp.setValid(prime20Address);
    await prime20.setPulp(rPulp.address);
    await prime20.setPool(ePool.address);

};
