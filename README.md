# Decentralized Financial Crafting Protocol
## Financial Crafting
## Financial Smart Contract - Create ERC20 Token Purchase Agreements.
Party **A** agrees to sell token **X** for token **Z** within time period **P**.
Party **A** uses `Prime.sol` to mint a Prime, a Non-Fungible option token.

## What is it?
- Party A agrees to sell **1 wEth for 250 DAI until May**.
- Party A agrees to sell **1 MKR for 2 wEth until April**.

## How does it work?
- Party A **deposits** token as collateral.
- Party A gets a newly **minted** NFT to represent the agreement parameters.
- Party A can **trade**, give, or sell the NFT.
- Counterparty B can purchase the NFT from Party A. Then they can **burn** the NFT and **buy the collateral** of Party A, for the price specified by the NFT.

## Why use this?    
- **Ex.** Party A agrees to sell **1 wEth for 250 DAI until May**. If wEth is worth more than 250 DAI at any point until May, it would be profitable to burn the NFT and purchase the collateral for 250 DAI. This is the same thing as: Counterparty has the right to buy 250 DAI for 1 wEth until April.
- **Ex.** Party A agrees to sell **1 MKR for 2 wEth until April**. If the collateral asset, MKR, drops to a value that is less than 2 wEth, it would be profitableto burn the NFT and purchase the collateral. This is the same thing as: Counterparty has the right to buy 2 wEth for 1 MKR until April.
- With the NFT, you can sell or buy assets for a price that can be more or less than market value.
- Because of this 'optionality' the NFT has its own value. An NFT could have addtional value if the underlying agreement is profitable when exercised.


# Spec
## What is a financial instrument?
- Monetary contract between parties; asset/liability.
- Cash instruments determined by market, derivative instruments derive value from characteristics.

## DFCP Overview:
- Instrument Controller
    - Agreement/obligation
        - Asset Class
            - Cash -> loan, bond, security
            - Derivative
                - Prime
                    - Properties
                        - Collateral Asset
                        - Payment Asset
                        - Expiration Date

## What is a valuable characteristic?
* Optionality
    - The value of additional optional investment opportunities available only after having made an initial investment.

## Hurdles:
* Price oracles - pricing of assets relative to other assets is difficult
* Interchangeability - Instrument needs fluiditiy and simplicity that could be beyond scope of possiblility right now.
* Liquidity - Derivatives are less liquid than the securities market they underly. DeFi already has limited liquidity, 
    so this would be even less liquidity for other financial instruments.
* 'House of Cards' - The collateral in the system could decline by an amount that triggers collapse of stability in some assets.
* Basically, how do you collateralize with an asset that will always worth paying down debt for?

## Solutions:
* Price Oracles - Rather than track prices relatively, rational actors are incentivized to capture arbritrage value. If an exchange rate between assets of a Prime is better than the market rate, it would be exercised by the rational actor.
* Interchangeability - We introduce a system of simplistic financial instruments deployed with the use of factory contracts and a hierarchy of 'stacks'.
* Liquidity - Initial liquidity can be jumpstarted by creation instruments derived from the most liquid assets.
* 'House of Cards' - Solution being explored.

## Overview:
- Instrument Controller
    - Instrument Registry
    - Asset Registry
    - Pair Registry
        - Asset Factory
        - Pair Factory
        - Token Factory
            - Asset
                - Paired with asset ?
                - Expiration
                - ...characteristics
                    - ERC-20 Token or new standardized contract?