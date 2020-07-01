# Testing

The testing files match the module directory structure.

## Use Docker

```
docker build -t primitive-contracts
docker run -it --name primitive primitive

npm run test
npm run coverage
```

## Or...

#### Steps to testing using the buidler EVM

Step 1 - Install Dependencies

    npm run clean-install

Step 2 - Compile Contracts

    npm run compile

Step 3 - Start Buidler EVM Node

    npm run bevm

Step 4 - Run the tests

    npm run test

#### Steps to testing using the ganache-cli on forked mainnet

Step 1

    npm i

Step 2

    npm compile

Step 3 - A forked mainnet node with network ID 999 is required.

    npm start:f-mainnet

Step 4

    npm test:f-mainnet

#### Coverage

For coverage, we use buidler's plugin for solidity-coverage.

    npm run coverage

#### Linting

For linting you can run this command which uses the solium linter:

    npm run lint

Solium can also fix some linting errors which can be checked with this command:

    npm run lint:fix

#### Static analysis

For static analysis you can run the contracts through slither with this command:

    npm slither
