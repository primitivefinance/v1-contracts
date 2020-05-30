const Dai = artifacts.require("DAI");
const PrimeOption = artifacts.require("PrimeOption");
const PrimePool = artifacts.require("PrimePool");
const PrimeTrader = artifacts.require("PrimeTrader");
const PrimeRedeem = artifacts.require("PrimeRedeem");

module.exports = async () => {
    let totalDai = web3.utils.toWei("100000");
    const dai = await Dai.new(totalDai);
    Dai.setAsDeployed(dai);

    /* const MAINNET_ORACLE = '0xdA17fbEdA95222f331Cb1D252401F4b44F49f7A0';
    const MAINNET_WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const MAINNET_DAI = daiAddress;
    const MAINNET_UNI_FACTORY = '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95';

    const tokenU = MAINNET_DAI;
    const tokenS = MAINNET_WETH;
    const marketId = 1;
    const poolName = "ETH Short Put Pool LP";
    const poolSymbol = "PULP";
    const optionName = "ETH Put 200 DAI Expiring May 30 2020";
    const optionSymbol = "PRIME";
    const redeemName = "ETH Put Redeemable Token";
    const redeemSymbol = "REDEEM";
    const base = web3.utils.toWei('200');
    const price = web3.utils.toWei('1');
    const expiry = '1590868800'; // May 30, 2020, 8PM UTC

    const trader = await PrimeTrader.new(MAINNET_WETH);
    PrimeTrader.setAsDeployed(trader);

    const prime = await PrimeOption.new(
        optionName,
        optionSymbol,
        marketId,
        tokenU,
        tokenS,
        base,
        price,
        expiry
    );
    PrimeOption.setAsDeployed(prime);

    const redeem = await PrimeRedeem.new(redeemName, redeemSymbol, prime.address, tokenS);
    PrimeOption.setAsDeployed(redeem);

    const pool = await PrimePool.new(
        MAINNET_WETH,
        MAINNET_ORACLE,
        MAINNET_UNI_FACTORY,
        poolName,
        poolSymbol
    );
    PrimePool.setAsDeployed(pool);

    await prime.initTokenR(redeem.address);
    await pool.addMarket(prime.address);

    const factory = await UniFactoryLike.new(MAINNET_UNI_FACTORY);
    UniFactoryLike.setAsDeployed(factory); */

    console.log("Truffle fixture deployed!");
};
