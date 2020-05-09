usePlugin("@nomiclabs/buidler-truffle5");
usePlugin("@nomiclabs/buidler-solhint");
usePlugin("buidler-gas-reporter");
usePlugin("solidity-coverage");
usePlugin("@nomiclabs/buidler-etherscan");
usePlugin("@nomiclabs/buidler-web3");
require("dotenv").config();
const ETHERSCAN_APY_KEY = process.env.ETHERSCAN_APY_KEY;
const web3 = require('web3');


task("accounts", "Prints the list of accounts", async () => {
  const accounts = await web3.eth.getAccounts();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});


module.exports = {
  networks: {
    local: {
      url: "http://127.0.0.1:8545",
      gasPrice: 80000000000,
      timeout: 1000000
    },
  }, 
  mocha: {
    timeout: 100000000,
    useColors: true
  },
  etherscan: {
    url: "https://api.etherscan.io/api",
    apiKey: ETHERSCAN_APY_KEY
  },
  gasReporter: {
    currency: 'USD',
    showTimeSpent: true,
    enabled: true,
    currency: 'USD',
  },
  solc: {
    version: "0.6.2",
  },
};
