# Scripts

## Verify

This script will verify most of the core protocol contracts on etherscan. There are problems with verifying conmtracts with libraries linked (Option Factory and Redeem Factory). Also, since the options are clones, there is no way to individually verify each option contract.

```
yarn verify:rinkeby
yarn verify:mainnet
```

## Deploy Options

With the protocol setup on rinkeby or mainnet, running this script will deploy both the specified option series and uniswap pools to go with them.

```
yarn deploy-options:rinkeby
yarn deploy-options:mainnet
```
