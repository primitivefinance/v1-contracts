# Scripts

Buidler does not have a `migrations` folder or system like truffle. Instead, buidler uses these scripts to deploy contracts.

The `deploy` script will deploy the contracts to the specified network using `--network`.

To deploy to mainnet:

    npm deploy:mainnet

To deploy to a local environment (forked mainnet):

    npm deploy:local

To deploy to a test environment (rinkeby):

## FIX - Add test net system.