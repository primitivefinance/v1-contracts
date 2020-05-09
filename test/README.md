# Testing

In order to get a deployed instance of our contracts into the buidler testing environment, we can use a `truffle-fixture`. This truffle fixture works a lot like migrations in that it lets us get our contract instance using the `.deployed()` method.

To test on forked-mainnet:

    npm test:local

To deploy to a test environment (rinkeby):

    - NOT YET WORKING -npm test:testnet

## FIX - Add testnet test system.