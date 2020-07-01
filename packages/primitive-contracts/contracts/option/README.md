# Option Module

The option module is a contract library that defines the option's attributes, mechanics, and creation.

## Overview

-   Primitives/option+redeem
-   Extensions/trader
-   Applications/registry
-   Interfaces/option+registry

## External Dependencies - All Open Zeppelin

-   ReentrancyGuard
-   SafeMath
-   ERC20
-   Ownable
-   Pausable

## Primitives

The option is a standalone contract that inherits the ERC-20 token contract and some utility contracts, all from Open Zeppelin's contract library. The option is paired with a redeem token contract, which is a vanilla ERC-20 with a `mint` and `burn` function that is only callable by the option contract.

## Extensions

The option contract is designed as a low level contract. It is not user friendly, and so it requires another contract called Trader to improve the user experience. Trader is a layer between the user and the option contract that handles the appropriate checks and balances necessary to interact directly with the option contract.

## Applications

There is a Registry contract which is in control of two factory contracts, the Option and Redeem factories. The function `deployOption` in the `Registry.sol` will (1) deploy an option with the five passed in parameters, (2) deploy a fresh redeem contract, (3) link the redeem contract to the option contract, and (4) store the option's address in a mapping called `options` using a key called `id`. `id` is a keccak256 hash of the five parameters of the option.

There cannot be more than one option with the exact same five parameters.

Options can only be deployed on supported tokens, which is defined in a mapping called `isSupported`. At this stage, only the Primitive Team has access to changing which tokens are supported. The reason we are doing this is because not all ERC-20 tokens are the same, and we have not yet examined all types of ERC-20 tokens and their effects on the contracts. For example, ERC-20 tokens with fees built-in could cause problems.

Additionally, at this stage, only the Primitive Team will have access to the `deployOption` function. This is because our goal is to build healthy options market. Limiting the offerings to a select few, likely to be popular, options series will improve the overall market liquidity. This is the first step, and not the final feature.
