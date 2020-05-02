# Testing

The supported networks for testing the contracts are mainnet and rinkeby. Local development using ganache
does not work well because the contracts use an oracle and WETH, which are deployed to the supported networks.

Testing on mainnet is easy, we just fork mainnet to a local ganache-cli instance! This requires a few things.

First, run: `npm i`

This will install the dependencies for the testing tools we use and dependency contracts. Most of the contracts import OpenZeppelin contracts from the latest version (as of April 26, 2020, we are using OpenZeppelin v3.0 which was just released). The contracts will not compile correctly if they can't find these contracts in node_modules!

Other tools we will need to have installed which are not in the dependencies:

-   `npm install ganache-cli` [ganache-cli github](https://github.com/trufflesuite/ganache-cli)
-   `pip3 install slither` [slither github](https://github.com/crytic/slither)

Ganache-cli will let us fork mainnet to run a local blockchain. In the `truffle-config.js` file this forked mainnet is called 'local'.

We are going to need a few more things. Forking mainnet requires a running node, usually you can plug into one online. We can use infura and get a mainnet endpoint from the API. This API key will be in our .env file.

With all this we should be prepared to run the tests locally. This will use the oracle and WETH addresses that are deployed on mainnet.

We can prep the code by doing some static analysis:

-   `truffle compile --all` this compiles the contracts for us
-   `solium -d ./contracts` this lints the contracts for us
-   `slither .` this will tell us everything wrong with the contracts by doing static analysis

Start up the forked mainnet local blockchain:

-   `ganache-cli -f INFURA_MAINNET_API_ENDPOINT -m MNEMONIC_PHRASE -i 999` the -f means forking mainnet. the -m is optional but it lets you run the tests using your own mnemonic phrase. -i is the network id which is 999 and that is specified in the truffle-config.

This will let you run the following command successfully!

-   `truffle test --network local ./test/TESTNAME.js`

The contracts may take long to test. The controller contracts are deployed first, the specifics to the deployment are in the migration files.

In each test, the `before` statement will call the function `createMarket`. This will create an option contract with the `marketId` '1'.

The tests will run off this option contract.

The `createMarket` function deploys a new PrimeOption.sol contract, a PrimeRedeem.sol contract using the Prime option address, it then calls the function initRedeem which sets the Prime's address to a global variable in Prime Redeem. It then checks if there is a 'pool' that matches the token's parameters. If there is a pool with matching tokenU and tokenS then it will add the Option to the Pool. This means the pool will support writing options for it. This is actually currently not a feature. The pool only supports one option market right now, for the alpha and for simplicity.

In your .env file you should have the following:

-   `MAINNET = INFURA_API_MAINNET_ENDPOINT`
-   `MNEMONIC = 12_WORD_PHRASE`
