module.exports = {
    skipFiles: [
        "./test/OracleLike.sol",
        "./test/UniExchange.sol",
        "./test/UniExchangeLike.sol",
        "./test/UniFactory.sol",
        "./test/UniFactoryLike.sol",
        "./oracle.js",
        "./tokens",
        "./test",
        "./forked-mainnet/pool-mainnet.js",
    ],
    providerOptions: {
        default_balance_ether: "1000",
    },
};
