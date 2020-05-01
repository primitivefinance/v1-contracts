const PrimeTrader = artifacts.require("PrimeTrader.sol");
const PrimeOption = artifacts.require("PrimeOption.sol");
const PrimePool = artifacts.require("PrimePool.sol");
const PrimeRedeem = artifacts.require("PrimeRedeem.sol");
const Dai = artifacts.require("DAI");

module.exports = async (deployer, network) => {
    const rinkebyWeth = '0xc778417e063141139fce010982780140aa0cd5ab';
    const mainnetWeth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const mainnetCompoundOracleProxy = '0xdA17fbEdA95222f331Cb1D252401F4b44F49f7A0';
    const mainnetDAI = '0x6b175474e89094c44da98b954eedeac495271d0f';

    let weth;
    if (network === 'rinkeby') {
        weth = rinkebyWeth;
    } else {
        weth = mainnetWeth;
    }
    let tokenU = mainnetDAI;
    /* if (network === 'local') {
        let dai = await Dai.deployed();
        tokenU = dai.address;
    } */
    const tokenS = weth;
    const marketId = 1;
    const poolName = "ETH Short Put Pool";
    const poolSymbol = "PULP";
    const optionName = "ETH Put 200 DAI Expiring May 30 2020";
    const optionSymbol = "PRIME";
    const redeemName = "ETH Put Redeemable Token";
    const redeemSymbol = "REDEEM";
    const base = web3.utils.toWei('200');
    const price = web3.utils.toWei('1');
    const expiry = '1590868800'; // May 30, 2020, 8PM UTC
    console.log({
        tokenU,
        tokenS,
        base,
        price,
        expiry
    });
    

    /* await deployer.deploy(PrimeTrader, weth); */
    /* let pool = await deployer.deploy(
        PrimePool,
        weth,
        mainnetCompoundOracleProxy,
        poolName,
        poolSymbol,
    ); */
    await deployer.deploy(
        PrimeOption,
        optionName,
        optionSymbol,
        marketId,
        tokenU,
        tokenS,
        base,
        price,
        expiry
    );
    let prime = await PrimeOption.deployed();
    await deployer.deploy(
        PrimeRedeem,
        redeemName,
        redeemSymbol,
        prime.address,
        tokenS
    );
    let redeem = await PrimeRedeem.deployed();

    console.log(redeem.address, prime.address)
    await prime.initTokenR(redeem.address);
    console.log(await prime.tokenR());
    /* await pool.addMarket(prime.address); */
};
