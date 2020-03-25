# Primitive

![](https://img.shields.io/github/stars/primitivefinance/primitive-v1?style=social)
![](https://img.shields.io/twitter/follow/PrimitiveFi?style=social)
![](https://img.shields.io/discord/168831573876015105?style=social)

Primitive is an on-chain options protocol. 

It is powered by the Prime, an ERC-721 digital option. 
Prime owners can use the Prime to swap assets at a predefined exchange rate, but only for a fixed
period of time. 

These Primes have their own value derived by the value of the underlying assets. The holder **can** buy or pseudo-sell the *collateralized asset* for an amount of *strike asset*. The protocol has the ability to support any ERC-20 token.

Buyers pay for the Prime in exchange for the rights granted by it. Sellers provide the collateralized asset and allow the collateral to be purchasable at the buyer's discretion. They earn the premiums paid by buyers. For a seller to close a position, (i.e. withdraw their collateral) they would need to buy back a matching Prime for the market premium it trades at.

# DApp
[Primitive.finance](https://www.primitive.finance)

# **Use Cases**
### Leverage
Primes give the user the ability to hold a leveraged position at a lower cost than outright owning the assets. It's made possible because purchasing a Prime option is cheaper than purchasing the assets used to collateralize it. This is a *capital efficient* instrument because the user can control a large position without putting 100% of the capital upfront. 

### Shorting
It also enables holders to short assets by purchasing Primes with a strike price lower than the market rate. This is a hedging instrument that can reduce the risk exposure to any ERC-20 token supported by the protocol. 

### Upfront Interest
Users who write the Primes, collateralize and sell them, earn the premiums upfront. Earning this premium upfront saves the time-value-of-money it would have generated if it was a periodic interest payment. Premiums are kept by the sellers. 

### Returns on any ERC-20
Another key use case is the ability to earn a return on an ERC-20 token that may not have many ways to earn a return. For example, sBTC (synth bitcoin), is an ERC-20 with currently no platforms that provide interest on deposits. A user with sBTC can collateralize and sell a Prime and therefore earn a premium by selling the option.

# What makes Primes Unique?

### Interchange - Ability
These are use-cases of options derivatives, an established financial instrument. 

Primes are unique because they can enable **any** established token standard to have its own derivatives market, dependent on the liquidity provided by Prime writers. Not only ERC-20s, but the ERC-721s too! Since Primes are ERC-721 tokens, they could be used as the assets in other Primes, creating a **second-order derivative**.

Tokens like sBTC can have users generate their own returns, as long as there is demand.

# Fees
Primes are a two-sided instrument that need both buyers and sellers. A healthy amount of suppliers, (perhaps more sellers than buyers), makes the premiums of Primes competitive. This leads to a more accurate equilibrium price and also less slippage for traders. Therefore, to jumpstart liquidity in Primitive's market the seller incentive will need to be attractive.

A 30 basis point fee, 0.30%, from buy orders flows directly into a pool of funds which is output to sellers. This way, sellers will not only earn the premium on their written Primes, but also 0.25% of the system's orders when a sell order is filled. The remaining 0.05% is kept in the pool of funds, but is time locked. Those funds earn interest and become withdrawable by sellers after an epoch of Primes expire.

# System Architecture
![](https://user-images.githubusercontent.com/38409137/77393589-9014fc00-6d5a-11ea-804b-87d24ca3614e.png)

`Prime.sol` is the ERC-721 contract which the system surrounds. When a new Prime is minted, it is given the properties defined by the `Instruments.sol` library contract and arguments supplied by the user. 


For a Prime to be minted, the collateral amount given as an argument must also be deposited into the `Prime.sol` contract. The contract defines functionality beyond the base ERC-721 contract.

### `Prime.sol`
- `exercise` swaps the collateral asset with the strike asset if the Prime is not expired. 
- `close` will burn a matching Prime, allowing withdrawal of assets which were deposited as collateral.
- `withdraw` allows sellers to withdraw strike assets from exercised Primes from the `Prime.sol` contract.

`Exchange.sol` is a contract that enables trading of Primes. It is the DEX for Primes.

- `buyOrder` Buy a Prime that is currently listed for sale on the DEX
- `buyOrderUnfilled` Offer a bid for a token with properties defined by the user.
- `sellOrder` Mints then lists a Prime for sale on the DEX.

`Options.sol` defines each option chain. When the `Options.sol` contract is deployed it defines the initial 'option chains' supported by the `Exchange.sol`. 

When a user selects an expiration date and a pair of assets on the frontend interface, the `Options.sol` contract will define the available purchasable/writable Prime options. 

There is the function `addOptionChain` in `Options.sol`, which is only callable by the owner. This will allow additional option chains to be added to the exchange easily. This data could easily be handled off-chain, but by defining the available options on-chain it allows future decentralization.

`Proxy.sol` will be a contract that bundles transactions. Currently, the `sellOrder` function will:
- mint
- approve transfer to dex
- sell order to list prime

These three transactions lead to an uncomfortable wait time for the user. `Proxy.sol` has permission from the `Prime.sol` contract to mint a prime on behalf of the user and then immediately list it on the DEX for sale. This reduces the three transactions into one. Much better.

A future iteration of `Proxy.sol` will be able to bundle NFTs. This would allow multiples of Primes to be sold with ease. Currently, singleton Primes are minted and will be scaled from their `baseRatio` using a multiplier. This means, a Prime with a lot of collateral will have to be one large option contract. 

`Proxy.sol` will be able to batch mint and trade Primes so that one large order is 100x Small Primes rather than 1x Big Prime. It provides more liquidity to have 10x 1 ETH / 100 DAI Primes than 1x 10 ETH / 1000 DAI Prime. More users can purchase the smaller ones.

# Etherscan Addresses
*To be added...*

# Documentation
*To be added...*

# Contributing
*To be added...*