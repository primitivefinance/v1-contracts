![](https://raw.githubusercontent.com/primitivefinance/primitive-frontend/develop/src/icons/primitivebannersvg.svg)

# Primitive Protocol

[![](https://img.shields.io/github/stars/primitivefinance/primitive-v1?style=social)](https://img.shields.io/github/stars/primitivefinance/primitive-contracts?style=social)
![Twitter Follow](https://img.shields.io/twitter/follow/primitivefi?style=social)
[![Discord](https://img.shields.io/discord/168831573876015105.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/rzRwJ4K)

# Documentation

The database of Primitive protocol contracts and documentation is hosted on notion here: [Primitive Protocol HQ](https://www.notion.so/primitivefi/Primitive-Protocol-HQ-fc081b939bb04e2a90ccaebf36faa78e)

## Contracts

Primitive is a decentralized protocol for options that is focused on security and simplicity. Users and developers will tap into the protocol to offer and underwrite tokenized options on any ERC-20 token. The protocol operates without any centralized control, enabling an immutable set of smart contracts to work in perpetuity on Ethereum.

This repository has the core contracts for the Option primitives.

The live contract addresses are [here](https://www.notion.so/primitivefi/dc3b883ff9d94044b6738701b2826f7a?v=9e56507d430d4f4fb1939242cfb23736).

We use [Hardhat](https://hardhat.org) as a development environment for compiling, testing, and deploying the contracts.

# Testing

### Run Tests

`yarn test`

### Run Coverage

`yarn coverage`

### Deployments

`yarn deploy:mainnet`

`yarn deploy:rinkeby`

### Verify Deployments

`yarn verify:rinkeby`

`yarn verify:mainnet`

# Reports

## Coverage

The coverage report is available [here](https://www.notion.so/primitivefi/Coverage-Report-b49c6f99571c4307aa78c9a0c0175ca2).

## Gas

The gas report is available [here](https://www.notion.so/primitivefi/Gas-Report-9d89c906edec48ec9c4afe6209277f19).

# Contributing

Join the developers and team in the Primitive discord: [Discord](https://discord.gg/JBM6APT)

# Security

The disclosure of security vulnerabilities helps us ensure the security of our users.

How to report a security vulnerability?

If you believe you’ve found a security vulnerability in one of our contracts or platforms, send it to us by emailing [security@primitive.finance](mailto:security@primitive.finance). Please include the following details with your report:

- A description of the location and potential impact of the vulnerability.
- A detailed description of the steps required to reproduce the vulnerability.
