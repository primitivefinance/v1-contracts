# Testing

The supported networks for testing the contracts are mainnet and rinkeby. Local development using ganache
does not work well because the contracts use an oracle and WETH, which are deployed to the supported networks. 

Testing on mainnet is easy, we just fork mainnet to a local ganache-cli instance! This requires a few things.


First, run: `npm i`

This will install the dependencies for the testing tools we use and dependency contracts. Most of the contracts import OpenZeppelin contracts from the latest version (as of April 26, 2020, we are using OpenZeppelin v3.0 which was just released). The contracts will not compile correctly if they can't find these contracts in node_modules!

Other tools we will need to have installed which are not in the dependencies:
- `npm install ganache-cli` [ganache-cli github](https://github.com/trufflesuite/ganache-cli)
- `pip3 install slither` [slither github](https://github.com/crytic/slither)

Ganache-cli will let us fork mainnet to run a local blockchain. In the `truffle-config.js` file this forked mainnet is called 'local'.

We are going to need a few more things. Forking mainnet requires a running node, usually you can plug into one online. We can use infura and get a mainnet endpoint from the API. This API key will be in our .env file.

With all this we should be prepared to run the tests locally. This will use the oracle and WETH addresses that are deployed on mainnet.

We can prep the code by doing some static analysis:
- `truffle compile --all` this compiles the contracts for us
- `solium -d ./contracts` this lints the contracts for us
- `slither .` this will tell us everything wrong with the contracts by doing static analysis

Start up the forked mainnet local blockchain:
- `ganache-cli -f INFURA_MAINNET_API_ENDPOINT -m MNEMONIC_PHRASE -i 999` the -f means forking mainnet. the -m is optional but it lets you run the tests using your own mnemonic phrase. -i is the network id which is 999 and that is specified in the truffle-config.

This will let you run the following command successfully!

- `truffle test --network local ./test/TESTNAME.js`

The contracts may take long to test. The controller contracts are deployed first, the specifics to the deployment are in the migration files.

In each test, the `before` statement will call the function `createMarket`. This will create an option contract with the `marketId` '1'.

The tests will run off this option contract.

The `createMarket` function deploys a new PrimeOption.sol contract, a PrimeRedeem.sol contract using the Prime option address, it then calls the function initRedeem which sets the Prime's address to a global variable in Prime Redeem. It then checks if there is a 'pool' that matches the token's parameters. If there is a pool with matching tokenU and tokenS then it will add the Option to the Pool. This means the pool will support writing options for it. This is actually currently not a feature. The pool only supports one option market right now, for the alpha and for simplicity.

In your .env file you should have the following:

- `MAINNET = INFURA_API_MAINNET_ENDPOINT`
- `MNEMONIC = 12_WORD_PHRASE`

# Primitive

![](https://img.shields.io/github/stars/primitivefinance/primitive-v1?style=social)
![](https://img.shields.io/twitter/follow/PrimitiveFi?style=social)
![](https://img.shields.io/discord/168831573876015105?style=social)

Primitive is an on-chain options protocol. 

## Introduction

The Primitive Protocol defines the Prime ERC-20, a call or put option derivative for ERC-20 and Ether assets. Call and put options carry the contractual right, but not the obligation, to swap the strike assets for the underlying assets at the holder’s discretion. Primes are American style option ERC-20 tokens that are traded through Primitive’s Pool contract or on third party exchanges like Uniswap.

The Prime ERC-20 wraps underlying assets which are only accessible by the holders of the Prime. There are two ways to withdraw those underlying assets.

- (1) The holder of the Prime can ‘exercise’ the option, which would swap the holder’s strike assets for the underlying assets held by the Prime. The Prime is burned.

- (2) Original minters of Primes (users who deposit the underlying assets) receive the newly minted Prime ERC-20 Options and a second token called Prime Redeem. Original minters can burn the Prime and Prime Redeem tokens to withdraw the underlying assets that they deposited. This is a reverse-mint process.

Prime Redeem tokens are used to withdraw the strike assets from exercised Primes. If a user has exercised their right, like in example (1), they swapped the strike assets for underlying assets. Only users with Prime Redeem tokens can withdraw those strike assets.

This simple swap function embeds optionality into Primes, the holders can keep their strike assets or swap them for underlying assets. However, this optionality has a fixed lifetime. These Primes have an expiration date. When they expire, the swap function is locked, and the underlying assets are withdrawable by the original minters using the Prime Redeem tokens. 

The underlying assets remain locked in the Prime contract until the holder exercises the option, or the option expires. The Prime Redeem holders are incentivized to hold onto their Redeem tokens until the corresponding Prime ERC-20 Options expire because then they can withdraw underlying assets, which are most likely worth more than their strike asset counterpart.

## Risk
The Alpha Primitive release is deployed to mainnet with unaudited contracts. Users who interact with any Primitive contracts will put their funds at risk. 

We have purposefully developed the alpha contracts with limited features, pause functions, and limited access control in order to mitigate risk.

In the event of a vulnerability, and depending on the severity, we will pause every interaction except withdraws. 

In the event an Admin address is compromised, the only actions they can take are pausing the protocol (except withdraws), or creating new option markets. 

In the event of a flash crash of ETH’s price, the only oracle risk is in the Pool contract. Depending on the severity of the crash and the secondary effects on the Pool, we can pause the Pool. However, the Pool is designed to be able to handle a flash crash without side effects. The Prime Option contract does not handle any oracle interactions.

The interactions between the Prime Option contract and the Prime Pool contract function in parallel rather than integrated. They do not have special interactions with each other. They both exist, and use each other's functions like any other smart contract.

The Pool contract facilitates the interactions between traders and liquidity providers, a needed bridge. However, this is where the most risk is concentrated in the Primitive Protocol. The Pool contract will hold deposits from LPs while also facilitating trades with Traders using the Pool’s funds. LP funds are at risk while they remain unutilized in the Pool, and Traders funds are at risk when they conduct transactions. Utilized Pool funds are locked in the Prime Option contracts as underlying assets, which remains separate from the Pool. Only the holder of the Prime has access to the underlying assets of that Prime, up until the expiration date.

In the event the Pool has its entire balance sheet drained, underlying and strike assets, no funds locked in the Prime Option contract would be affected. At this point, the protocol would be paused to prevent further damage.

The worst case scenario would be if the Pool used all their funds to underwrite options, and the Pool’s Prime Redeem balance was drained. In this case, the Pool has no way to access their underlying assets or claimable strike assets. Therefore, to mitigate this risk, we have limited the amount of times that the Redeem balance of the Pool is transferred.

## Prime ERC-20 Option Tokens
### Instrument State

Primes are option-like instruments defined by the Instruments contract with the following attributes:

- Quantity of Underlying Asset
- Underlying Asset Address
- Quantity of Strike Asset
- Strike Asset Address
- Expiration Date

These asset pairs can be any combination of ERC-20 tokens and Ether. If one of the assets is Ether, the corresponding address will be the Prime ERC-20 token contract’s address (itself).

This is a struct object that is stored in the Prime contract. 

When a new Prime is deployed, an ERC-721 with this struct is also minted and tied to the newly deployed Prime contract. This way, the token Id of the ERC-721 acts as an identifier for the option. This is clearly not gas efficient, but it opens some potentially interesting ideas down the road. It currently doesn’t affect any functions.

### Prime Option Contract

The Prime Option contract is an ERC-20 token deployed through the use of a factory contract called Controller Option. Each deployed Prime contract is an option.

The Prime Option contract holds the state for key balances and connected contracts:

Balances of Prime Option holders.
Controller Option Contract.
Prime Redeem Contract.
Pool Contract.

The contract has four critical functions which give it the option-like properties as described:

#### Deposit
    Cost: Underlying Asset.
    Receive: Prime ERC-20 Option and Prime ERC-20 Redeem.
### Swap
    Cost: Strike Asset and Prime ERC-20 Option.
    Receive: Underlying Asset.

### Withdraw
    Cost: Prime ERC-20 Redeem.
    Receive: Strike Asset. Only if a Prime was exercised and there are strike assets available.
### Close
    Cost: Prime ERC-20 Option and Prime ERC-20 Redeem.
    Receive: Underlying Asset.

Traditional options are priced in a currency. Options on Ethereum can be priced in any token, so the term ‘strike price’ is relative to the ratio between underlying and strike assets. A 1 ETH Call Option could be priced with 150 DAI. This means the strike price is 150 DAI per 1 ETH.

*Quantity of Strike Assets / Quantity of Underlying Assets = Strike Price* 

We define an ETH Call option as the right to swap strike assets for ETH, and an ETH Put option as the right to swap ETH for strike assets. We also assume for all ETH options that the strike asset is a stablecoin. 

## Pool Liquidity
### Pool Contract

Primitive has a native liquidity pool connected to each Prime Option contract that is deployed. This pool serves as a bridge between traders and liquidity providers. A trader who wants to buy Primes can purchase them through the Pool. A trader who wants to write Primes (sell to open) can deposit funds in the Pool. 

Liquidity providers deposit only one asset, the underlying asset, in exchange for PULP tokens, Primitive Underlying Liquidity Provider.The Pool will use unutilized funds to mint the Prime, and then sell it to the buyer for a price defined in the Pool contract. The Pool’s balance will accrue the premiums from sold Primes, which are then distributed among the liquidity providers proportional.

### Adding and Removing Liquidity

When a user deposits underlying assets to the Pool they will be an amount of liquidity tokens proportional to the ratio between the Pool’s total supply of liquidity tokens and total pool balance. The total pool balance is the unutilized assets plus the utilized assets.

*Liquidity Tokens Minted = Underlying Asset Deposit * Total Liquidity Tokens / Total Pool Balance*

When a user withdraws liquidity from the Pool, they will burn an amount of liquidity tokens proportional to the total pool balance and total liquidity token supply.

*Withdrawn Underlying = Liquidity Tokens Burned * Total Pool Balance / Total Liquidity Tokens*


# Documentation
[Documentation](https://docs.primitive.finance)

# Etherscan Addresses
*To be added...*

# Contributing
*To be added...*