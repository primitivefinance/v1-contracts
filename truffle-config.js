require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider');
const rinkeby = process.env.RINKEBY;
const ropsten = process.env.ROPSTEN;
const mnemonic = process.env.TEST_MNEMONIC;

module.exports = {
  /* contracts_build_directory: './client/app/src/abi/', */
  contracts_build_directory: './build/contracts',
  networks: {
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
  },
  mocha: {
    timeout: 10000000,
    useColors: true,
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      showTimeSpent: true,
      outputFiile: 'gas-used.log',
      currency: 'USD',
      url: "http://localhost:8545"
    }
  },
  compilers: {
    solc: {
      version: "0.6.2",
      docker: false,
      settings: {
       optimizer: {
         enabled: false,
         runs: 200
       },
       evmVersion: "constantinople"
      }
    }
  }
}
