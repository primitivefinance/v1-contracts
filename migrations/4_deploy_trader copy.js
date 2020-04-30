const PrimeTrader = artifacts.require("PrimeTrader.sol");

module.exports = async (deployer, network) => {
    const rinkebyWeth = '0xc778417e063141139fce010982780140aa0cd5ab';
    const mainnetWeth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

    let weth;
    if (network === 'rinkeby') {
        weth = rinkebyWeth;
    } else {
        weth = mainnetWeth;
    }

    await deployer.deploy(PrimeTrader, weth);
};
