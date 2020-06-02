module.exports = {
    skipFiles: [
        "./Primitives.sol",
        "./interfaces",
        "./tokens",
        "./test",
        "./applications/PrimePerpetual.sol",
    ],
    providerOptions: {
        default_balance_ether: "1000",
    },
};
