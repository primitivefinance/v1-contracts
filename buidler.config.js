// == Libraries ==
const path = require("path");
const bip39 = require("bip39");
const crypto = require("crypto");
const ethers = require("ethers");
require("dotenv").config();

// == Plugins ==
usePlugin("@nomiclabs/buidler-solhint");
usePlugin("@nomiclabs/buidler-etherscan");
usePlugin("@nomiclabs/buidler-waffle");
usePlugin("buidler-gas-reporter");
usePlugin("buidler-spdx-license-identifier");
usePlugin("buidler-deploy");
usePlugin("solidity-coverage");

// == Environment ==
const ETHERSCAN_API_KEY =
    process.env.ETHERSCAN_API_KEY || crypto.randomBytes(20).toString("base64");
const rinkeby =
    process.env.RINKEBY ||
    new ethers.providers.InfuraProvider("rinkeby").connection.url;
const mainnet =
    process.env.MAINNET ||
    new ethers.providers.InfuraProvider("mainnet").connection.url;
const mnemonic = process.env.TEST_MNEMONIC || bip39.generateMnemonic();
const live = process.env.MNEMONIC || mnemonic;

// == Buidler Config ==
Object.assign(module.exports, {
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
            from: "0xaF31D3C2972F62Eb08F96a1Fe29f579d61b4294D",
            gasPrice: 60000000000,
        },
        rinkeby: {
            url: rinkeby,
            accounts: {
                mnemonic: mnemonic,
            },
            chainId: 4,
        },
        coverage: {
            url: "http://127.0.0.1:8555", // Coverage launches its own ganache-cli client
        },
    },
    mocha: {
        timeout: 100000000,
        useColors: true,
    },
    etherscan: {
        url: "https://api-rinkeby.etherscan.io/api",
        apiKey: ETHERSCAN_API_KEY,
        etherscanApiKey: ETHERSCAN_API_KEY,
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
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: "0xaF31D3C2972F62Eb08F96a1Fe29f579d61b4294D",
            4: "0xE7D58d8554Eb0D5B5438848Af32Bf33EbdE477E7",
        },
    },
    paths: {
        sources: path.join(__dirname, "contracts"),
        tests: path.join(__dirname, "test"),
        cache: path.join(__dirname, "cache"),
        artifacts: path.join(__dirname, "artifacts"),
        deploy: path.join(__dirname, "deploy"),
        deployments: path.join(__dirname, "deployments"),
    },
    spdxLicenseIdentifier: {
        overwrite: false,
        runOnCompile: false,
    },
});
