usePlugin("@nomiclabs/buidler-truffle5");
usePlugin("@nomiclabs/buidler-solhint");
usePlugin("buidler-gas-reporter");
usePlugin("solidity-coverage");
usePlugin("@nomiclabs/buidler-etherscan");
usePlugin("@nomiclabs/buidler-web3");
require("dotenv").config();
const crypto = require('crypto');
const ethers = require('ethers');
const ETHERSCAN_APY_KEY = process.env.ETHERSCAN_APY_KEY || crypto.randomBytes(20).toString('base64');
const web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const bip39 = require('bip39');
const rinkeby = process.env.RINKEBY || new ethers.providers.InfuraProvider('rinkeby').connection.url;
const mainnet = process.env.MAINNET || new ethers.providers.InfuraProvider('mainnet').connection.url;
const mnemonic = process.env.TEST_MNEMONIC || bip39.generateMnemonic();
const live = process.env.MNEMONIC || mnemonic;

task("accounts", "Prints the list of accounts", async () => {
    const accounts = await web3.eth.getAccounts();

    for (const account of accounts) {
        console.log(await account.getAddress());
    }
});

module.exports = {
    paths: {
        artifacts: "./artifacts",
    },
    networks: {
        local: {
            url: "http://127.0.0.1:8545",
            gasPrice: 80000000000,
            timeout: 1000000,
        },
        live: {
            url: mainnet,
            accounts: {
                mnemonic: live,
            },
            chainId: 1,
            from: "0x619F9Fb924c7e5fd6D21680b9bAc146FffB2D5C3",
            gasPrice: 15000000000,
        },
        rinkeby: {
            url: rinkeby,
            accounts: {
                mnemonic: mnemonic,
            },
            chainId: 4,
        },
    },
    mocha: {
        timeout: 100000000,
        useColors: true,
    },
    etherscan: {
        url: "https://api-rinkeby.etherscan.io/api",
        apiKey: ETHERSCAN_APY_KEY,
    },
    gasReporter: {
        currency: "USD",
        showTimeSpent: true,
        enabled: true,
        currency: "USD",
    },
    solc: {
        version: "0.6.2",
    },
};
