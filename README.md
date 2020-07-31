![](https://raw.githubusercontent.com/primitivefinance/primitive-frontend/develop/src/icons/primitivebannersvg.svg)

# Primitive Protocol

![GitHub stars](https://img.shields.io/github/stars/primitivefinance/primitive-protocol?style=social)
![Twitter Follow](https://img.shields.io/twitter/follow/primitivefi?style=social)
[![Discord](https://img.shields.io/discord/168831573876015105.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/rzRwJ4K)

Primitive is an options market protocol. Built on Ethereum.

## Risk

The protocol and software is in an alpha stage. While security is our core focus in the development process, the complex interactions with the protocol, other protocols, and incentive models could lead to vulnerabilities.

# Getting Started

After you git clone the monorepo.

```
yarn
```

This installs all the dependencies for the monorepo.

# Testing

```
cd packages/primitive-contracts
yarn bevm
yarn test
```

# Tooling

Coverage is currently bugged with the latest version of waffle, it will show 0 coverage.

```
yarn coverage
```

Linter

```
yarn lint
yarn lint:fix
```

# Contributing and Discussion

Join our community and protocol developers in the Primitive [Discord](https://discord.gg/rzRwJ4K).

# Security

If you have security concerns, email us at [security@primitive.finance](mailto:security@primitive.finance). We will have a bug bounty when the contracts are live on mainnet.
