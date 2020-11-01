# primitivefi/contracts

All contracts are in this directory.

## Subdirectories

- [`testing`](test): Contracts designed for testing purposes.

## Contracts

- [`Option`](option/primitives/Option.sol): Oracle-less option token.
- [`Redeem`](option/primitives/Redeem.sol): Paired redeem token for option.
- [`Registry`](option/applications/Registry.sol): Manages option clone contracts.
- [`OptionFactory`](option/applications/factories/OptionFactory.sol): Deploys option contract clones.
- [`RedeemFactory`](option/applications/factories/RedeemFactory.sol): Deploys redeem contract clones.
- [`Trader`](option/extensions/Trader.sol): Contract wrapper for Option.sol for SAFE interactions.
- [`CloneLib`](option/libraries/CloneLib.sol): Contains code for building the clones and deploying them with create2.

# Documentation

Documentation is also [here](https://docs.primitive.finance).

# Join the community in Discord

If you have a suggestion, request, or question you can join the protocol's developers and users in the [Discord](https://discord.gg/rzRwJ4K).
