usePlugin("@nomiclabs/buidler-truffle5");
usePlugin("@nomiclabs/buidler-solhint");
usePlugin("buidler-gas-reporter");
usePlugin("solidity-coverage");
usePlugin("@nomiclabs/buidler-etherscan");
usePlugin("@nomiclabs/buidler-web3");
require("dotenv").config();
const ETHERSCAN_APY_KEY = process.env.ETHERSCAN_APY_KEY;



// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await web3.eth.getAccounts();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  networks: {
    local: {
      url: "http://127.0.0.1:8545",
    },
  },
  /* networks: {
    development: {
     host: "127.0.0.1",  
     port: 7545,
     network_id: "5777", 
    },
    local: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "999",
    },
    live: {
      provider: () => new HDWalletProvider(live, mainnet),
      network_id: 1,     
      gas: 6500000,      
      confirmations: 2,  
      timeoutBlocks: 200,
      skipDryRun: false ,
      from: '0x619F9Fb924c7e5fd6D21680b9bAc146FffB2D5C3',
      gasPrice: web3.utils.toWei('7.5', 'gwei')
    },
    ropsten: {
      provider: () => new HDWalletProvider(mnemonic, ropsten),
      network_id: 3,     
      gas: 5500000,      
      confirmations: 2,  
      timeoutBlocks: 200,
      skipDryRun: false  
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, rinkeby),
      network_id: 4,       
      gas: 5500000,      
      confirmations: 0,    
      timeoutBlocks: 200,  
      skipDryRun: false    
    },
  }, */
  etherscan: {
    url: "https://api.etherscan.io/api",
    apiKey: ETHERSCAN_APY_KEY
  },
  gasReporter: {
    currency: 'USD',
    showTimeSpent: true,
    outputFiile: 'gas-used.log',
    currency: 'USD',
    url: "http://localhost:8545"
  },
  solc: {
    version: "0.6.2",
  },
};
