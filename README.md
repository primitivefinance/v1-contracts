# Primitive Protocol

[![](https://img.shields.io/github/stars/primitivefinance/primitive-v1?style=social)](https://img.shields.io/github/stars/primitivefinance/primitive-contracts?style=social)
![Twitter Follow](https://img.shields.io/twitter/follow/primitivefi?style=social)
[![Discord](https://img.shields.io/discord/168831573876015105.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/rzRwJ4K)

Primitive is an on-chain permissionless primitives protocol.

We overview the contracts and their functions as well as how to test them.

- Core Documentation: [Documentation](https://docs.primitive.finance)
- Protocol Overview: [Overview](https://docs.google.com/document/d/19neM6bFmTCBdxLygQbDDJubwcLcuMIx8x2Fs-llt9sQ/edit?usp=sharing)

Our development environment consists of the following:

- Buidler - Framework
- Solidity Visual Auditor - VS Code
- Slither - static analyzer
- Solium - linter
- Web3/Truffle plugins for Buidler
- Mocha - testing framework
- Chai, chai-bn, and bn.js - unit testing
- Truffle assertions - unit testing
- Open Zeppelin Contracts - contract dependency

# Contracts

## Mainnet
- Active - [PrimeOption - Primitive](https://etherscan.io/address/0xced83f96aa38bfe34617ea1f699f9f0022548f61)
0xced83f96AA38bFe34617ea1F699F9f0022548f61
- Active - [PrimeRedeem - Primitive](https://etherscan.io/address/0xb0a4d596939715f203fa9e907935938fedea715f)
0xB0A4d596939715f203Fa9E907935938FEdEa715F
- Active - [PrimeTrader - Extension](https://etherscan.io/address/0xff5c103d76586bb55bb33ce01f3dec9cee55617f)
0xff5C103d76586BB55bb33CE01f3dEc9cEe55617f
- Paused - [PrimePool - Extension](https://etherscan.io/address/0xf7a7126C6eB9c2cC0dB9F936bA4d0D5685662830)
0xf7a7126C6eB9c2cC0dB9F936bA4d0D5685662830

## Primitives

### Prime Option
The Prime is a smart token with vanilla option attributes and functionality embedded into the token. It inherits the ERC-20 token standard and adds functionality which matches the specification of a vanilla option.

#### The vanilla option specification:
    - Underlying asset.
    - Strike Price denominated in $USD.
    - Expiration date.

#### The Prime specification:
    - Address of underlying token.
    - Address of stike token.
    - "Base" value (Amount of underlying tokens).
    - "Price" value (Amount of strike tokens).
    - Expiration Date, a UNIX timestamp.

The Base and Price attributes make up the *strike ratio*.

    - Base / Price = Strike Ratio



### Prime Redeem

The Redeem token is a helper token for the Prime which manages the accounting for the underwriters. When underwriters deposit underlying tokens they receive Primes and also a 'receipt' token, the Redeem. This Redeem token is used to withdraw strike tokens from the Prime when the Prime's underlying tokens are exercised, or its used to withdraw underlying tokens when the Primes expire.

### Prime Trader

This is an extension contract to support easier interaction with the Prime Option contract. The Prime
Option contract operates with *optimistic swap* technology. It assumes that tokens are sent into it
before its functions are called. The Prime Option contract does not use any `transferFrom` calls.

The trader does the `transferFrom` call to the user, then it `transfer`s the tokens to the Prime Option contract, and finally it calls one of the functions in the Prime Option contract like `mint`.

The trader contract does this all in a single transaction and it can call any function in the Prime Option contract.

### Prime Pool

This is a liquidity pool contract that has the logic to (1) Accept underlying token deposits. (2) Mint Primes with the underlying tokens. (3) Sell the Primes for premium to buyers.

### Prime Oracle

Feeds a price, the *premium*, to the Prime Pool. The Primes are sold from the pool to buyers at this price given by the oracle.

# Documentation

[Documentation](https://docs.primitive.finance)

# Testing

The supported networks for testing the contracts are mainnet and rinkeby. Local development using ganache does not work well because the contracts use an oracle and WETH, which are deployed to the supported networks.

Testing on mainnet is easy, we just fork mainnet to a local ganache-cli instance! This requires a few things.

Step 1


    npm i

Step 2

    npm compile

Step 3
    
    npm test

#### Linting

For linting you can run this command which uses the solium linter:

    npm lint

Solium can also fix some linting errors which can be checked with this command:

    npm lint:fix

#### Static analysis

For static analysis you can run the contracts through slither with this command:

    npm slither


# Etherscan Addresses

[PrimeOption - Primitive](https://etherscan.io/address/0xced83f96aa38bfe34617ea1f699f9f0022548f61)

[PrimeRedeem - Primitive](https://etherscan.io/address/0xb0a4d596939715f203fa9e907935938fedea715f)

[PrimeTrader - Extension](https://etherscan.io/address/0xff5c103d76586bb55bb33ce01f3dec9cee55617f)

[PrimePool - Extension](https://etherscan.io/address/0xf7a7126C6eB9c2cC0dB9F936bA4d0D5685662830)

# Contributing and Discussion

Join our community and protocol developers in the Primitive [Discord](https://discord.gg/rzRwJ4K).

If you have security concerns, email us at [primitive@primitive.finance](mailto:primitive@primitive.finance).
