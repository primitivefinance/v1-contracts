# Primitive

![](https://img.shields.io/github/stars/primitivefinance/primitive-v1?style=social)
![](https://img.shields.io/twitter/follow/PrimitiveFi?style=social)
![](https://img.shields.io/discord/168831573876015105?style=social)

Primitive is an on-chain options protocol. 

It is powered by the Prime, an ERC-721 option. 
Prime owners can use the Prime to swap assets at a predefined exchange rate, but only for a fixed
period of time. 

These Primes have their own value derived by the value of the underlying assets. The holder **can** swap the *underlying asset* for an amount of *strike asset*. The protocol has the ability to support any ERC-20 token and Ether.

Buyers pay for the Prime in exchange for the rights granted by it. Sellers provide the underlying asset and allow the underlying to be purchasable at the buyer's discretion. They earn the premiums paid by buyers.

# Architecture
## Basic Analogy
- Prime.sol: Chips
- Exchange.sol: Table
- Pool.sol: House
- Instruments.sol: Chip Type
- Options.sol: Game
## Overview
### Primary Contracts
The `Prime.sol` contract manages its native Prime ERC-721 token, an option-like financial instrument. The contract extends the functionality of an ERC-721 token to give it properties such as optionality. Additional functions are defined that give the holder the ability to swap the underlying asset for strike assets. The token is transferable easily between ERC-721 receiver contracts and user addresses, which give the option composability between any protocol.


The `Exchange.sol` facilitates a trading environment for these ERC-721 tokens. Buy and Sell orders are submitted to the DEX and the DEX settles the trade. Users have the ability to trade these Prime options peer-to-peer.


The `Pool.sol` acts as a market-maker to bootstrap liquidity in the DEX. Facilitating trades between peers does not work if there is no supply-side peers. The Pool uses deposited funds to underwrite options in order to fill buy orders. Peers will compete with the pricing of the Pool's underwritten options. This means that if there is no peer that offers an option for a cheaper price than the Pool, then the Pool will fill the order.

### Supporting Contracts


The `Instruments.sol` contract defines the Primes struct. This is an object that stores attributes and ties it to minted Primes through the Prime's ID. An option has financial properties, assets that it manages and when the option expires. This Primes struct stores that information.


The `Options.sol` contract defines which option series that the `Exchange.sol` and `Pool.sol` will support. Any combination of a Prime Series can be created; any two ERC-20's (or Ether) and an expiration date. The Exchange and Pool will only support a predefined series on deployment. This is to focus the system's liquidity into a select few options. Higher liquidity in these selected options will be a better trading experience for users. The option series is defined as: an asset pair of ERC-20 tokens and/or ETH and an expiration date. This option series is identified by the Primes struct attribute: chain. The chain is a keccak256 hash of the asset pair and expiration date and it acts a symbol for the option series.

# Frontend
[Primitive.finance](https://primitive.finance)

# **Use Cases**
### Leverage
Primes give the holder the ability to hold a leveraged position. This is because purchasing a Prime option is cheaper than purchasing the assets underlying it. While holding a Prime, the holder still has effective control over the assets even though they are not owned by the holder.

### Shorting
Purchasing a Prime with a strike price lower than the market rate allows one of the assets to be shorted. This is a hedging instrument that can reduce the risk exposure to any ERC-20 token supported by the protocol.

### Upfront Interest
Users who write the Primes, mint then sell the Primes on the DEX, earn the premiums upfront. Earning this premium upfront saves the time-value-of-money it would have generated if it was a periodic interest payment. Premiums are kept by the sellers. 

### Returns on any ERC-20
Has the ability to earn a return on an ERC-20 token that may not have many ways to earn a return. For example, sBTC (synth bitcoin), is an ERC-20 with currently no platforms that provide interest on deposits. A user with sBTC can deposit it as an underlying asset in a Prime and sell the Prime and therefore earn a premium on their sBTC deposit.

# Documentation
[Documentation](https://docs.primitive.finance)

# Etherscan Addresses
*To be added...*

# Contributing
*To be added...*