# Option Module

The option module is a contract library that defines the option's attributes, mechanics, and creation.

## Overview

- Primitives/option+redeem
- Extensions/trader
- Applications/registry
- Interfaces/option+registry

## External Dependencies - All Open Zeppelin

- ReentrancyGuard
- SafeMath
- ERC20
- Ownable
- Pausable

## Primitives

The option is a standalone contract that inherits the ERC-20 token contract and some utility contracts, some from Open Zeppelin's contract library. The option is paired with a redeem token contract, which is a vanilla ERC-20 with a `mint` and `burn` function that is only callable by the option contract.

## Extensions

The option contract is designed as a low-level contract. It is not user friendly, and so it requires another contract called Trader to improve the user experience. Trader is a layer between the user and the option contract that handles the appropriate checks and balances necessary to interact directly with the option contract.

## Applications

There is a Registry contract which is in control of two factory contracts, the Option and Redeem factories. The function `deployOption` in the `Registry.sol` will (1) deploy an option with the five passed in parameters, (2) deploy a fresh redeem contract, (3) link the redeem contract to the option contract, and (4) store the option's address in a mapping called `allOptionClones`.

There cannot be more than one option with the exact same five parameters.
