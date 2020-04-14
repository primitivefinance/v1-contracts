# Architecture
- PrimeOption : ETH/ERC-20 Option as an ERC-20 Token
- PrimeExchange : ETH/ERC-20 PrimeOption Token Pool for Exchange
- PrimePool : Market Making Pool to supply PrimeExchange with PrimeOptions
- PrimeRedeem : An ERC-20 Token to Redeem Strike Assets Prime Options or Close Prime Options
- Instruments : Defines the PrimeOption
- Options : Instrument Controller for the Options Instrument - Deploys Option Markets
# Overview
## Primary Contracts
The Prime.sol contract manages its native Prime ERC-721 token, an option-like financial instrument. The contract extends the functionality of an ERC-721 token to give it properties such as optionality. The token is transferable easily between ERC-721 receiver contracts and user addresses, which give the option composability between any protocol.


The Exchange.sol facilitates a trading environment for these ERC-721 tokens. Buy and Sell orders are submitted to the DEX and the DEX settles the trade. Users have the ability to trade these Prime options peer-to-peer.


The Pool.sol acts as a market-maker to bootstrap liquidity in the DEX. Facilitating trades between peers does not work if there is no supply-side peers. The Pool uses deposited funds to underwrite options in order to fill buy orders. Peers will compete with the pricing of the Pool's underwritten options. This means that if there is no peer that offers an option for a cheaper price than the Pool, then the Pool will fill the order.

## Supporting Contracts

The Instruments.sol contract defines the Primes struct. This is an object that stores attributes and ties it to minted Primes through the Prime's ID. An option has financial properties, assets that it manages and when the option expires. This Primes struct stores that information.

The Options.sol contract defines which option series that the Exchange.sol and Pool.sol will support. Any combination of a Prime Series can be created; any two ERC-20's (or Ether) and an expiration date. The Exchange and Pool will only support a predefined series on deployment. This is to focus the system's liquidity into a select few options. Higher liquidity in these selected options will be a better trading experience for users. The option series is defined as: an asset pair of ERC-20 tokens and/or ETH and an expiration date. This option series is identified by the Primes struct attribute: series. The series is a keccak256 hash of the asset pair and expiration date and it acts a symbol for the option series.