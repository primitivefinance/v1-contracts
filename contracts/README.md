# Architecture
## Prime and Slate

The Prime is an agreement committed by a party to sell their collateral for a predetermined price, denominated in the predetermined asset. 

The Slate is the NFT representation of this contractual agreement. It uses the ERC-721 standard.

## Functions

`Prime.sol`
### Prime has these core functions
- `createSlate` - Creates a new Slate NFT by depositing collateral.
- `exercise` - Exercises the right defined by the contract; Right to purchase collateral.
- `close` - If a party wishes to withdraw their collateral, they can burn the Slate NFT minted by them, or purchase another Slate NFT with identical properties.
- `withdraw` - Asset transfers out of Prime.sol use this withdraw method rather than sending directly to the payment receiver.

`Slate.sol`
### Slates have the following properties:
- ace - Minter of Slate NFT
- xis - Collateral asset quantity
- yak - Collateral asset address
- zed - Payment asset quantity
- wax - Payment asset address
- pow - UNIX Timestamp that the Slate NFT expires
- gem - Address of Payment asset receiver