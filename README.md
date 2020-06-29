![](https://raw.githubusercontent.com/primitivefinance/primitive-frontend/develop/src/icons/primitivebannersvg.svg)

# Primitive Protocol

[![](https://img.shields.io/github/stars/primitivefinance/primitive-v1?style=social)](https://img.shields.io/github/stars/primitivefinance/primitive-contracts?style=social)
![Twitter Follow](https://img.shields.io/twitter/follow/primitivefi?style=social)
[![Discord](https://img.shields.io/discord/168831573876015105.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/rzRwJ4K)

Primitive is an options market protocol. Built on Ethereum.

## Risk

The protocol and software is in an alpha stage. While security is our core focus in the development process, the complex interactions with the protocol, other protocols, and incentive models could lead to vulnerabilities.

## Overview

We overview the contracts and their functions as well as how to test them.

-   Documentation: [Documentation](https://docs.primitive.finance)
-   Protocol Overview: [Overview](https://docs.google.com/document/d/19neM6bFmTCBdxLygQbDDJubwcLcuMIx8x2Fs-llt9sQ/edit?usp=sharing)

# Environment

Our development environment consists of the following:

-   Buidler - Development Framework
-   Web3/Truffle/Ethers plugins for Buidler
-   Buidler-deploy plugin for getting deployed contract artifacts.
-   Mocha - testing framework
-   Chai, chai-bn, and bn.js - unit testing and our choice of BN library
-   Truffle assertions - unit testing
-   Solidity Visual Auditor - VS Code
-   Slither - static analyzer
-   Solium - linter
-   Open Zeppelin Contracts - external contracts dependency

# Contracts

## Mainnet

| Status  | Contract | Address                                    | Link                                                                                 |
| :-----: | :------- | :----------------------------------------- | :----------------------------------------------------------------------------------- |
| Expired | Option   | 0xced83f96AA38bFe34617ea1F699F9f0022548f61 | [Etherscan](https://etherscan.io/address/0xced83f96aa38bfe34617ea1f699f9f0022548f61) |
| Expired | Redeem   | 0xB0A4d596939715f203Fa9E907935938FEdEa715F | [Etherscan](https://etherscan.io/address/0xb0a4d596939715f203fa9e907935938fedea715f) |
| Active  | Trader   | 0xff5C103d76586BB55bb33CE01f3dEc9cEe55617f | [Etherscan](https://etherscan.io/address/0xff5c103d76586bb55bb33ce01f3dec9cee55617f) |
| Expired | Pool     | 0xf7a7126C6eB9c2cC0dB9F936bA4d0D5685662830 | [Etherscan](https://etherscan.io/address/0xf7a7126C6eB9c2cC0dB9F936bA4d0D5685662830) |

# Documentation

[Documentation](https://docs.primitive.finance)

# Testing

## Use Docker

```
docker build -t primitive-contracts
docker run -it --rm --name primitive primitive

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

# Contributing and Discussion

Join our community and protocol developers in the Primitive [Discord](https://discord.gg/rzRwJ4K).

# Security

If you have security concerns, email us at [security@primitive.finance](mailto:security@primitive.finance). We will have a bug bounty when the contracts are live on mainnet.
