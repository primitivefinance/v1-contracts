# carbon
Interchangeable finance.


# Spec
What is a financial instrument?
- Monetary contract between partiers; asset/liability.
- Asset class is equity or debt based, short/long term, cash or derivative instruments.
- Cash instruments determined by market, derivative instruments derive value from characteristics.

* Overview:
- Instrument
    - Agreement/obligation
        - Asset Class
            - Cash -> loan, bond, security
            - Derivative
                - Options
                    - Maturity
                    - Strike
                    - Underlying

What is a valuable characteristic?
* Optionality
    - The value of additional optional investment opportunities available only after having made an initial investment.

Hurdles:
* Price oracles - pricing of assets relative to other assets is difficult
* Interchangeability - Instrument needs fluiditiy and simplicity that could be beyond scope of possiblility right now.
* Liquidity - Derivatives are less liquid than the securities market they underly. DeFi already has limited liquidity, 
    so this would be even less liquidity for other financial instruments.
* 'House of Cards' - The collateral in the system could decline by an amount that triggers collapse of stability in some assets.
* Basically, how do you collateralize with an asset that will always worth paying down debt for?

Solutions:
* Price Oracles - Rather than track prices relatively, rational actors are incentivized to capture arbritrage value, so the assets will be internally priced.
* Interchangeability - We introduce a system of simplistic financial instruments deployed with the use of factory contracts and a hierarchy of 'stacks'.
* Liquidity - Initial liquidity can be jumpstarted by creation instruments derived from the most liquid assets.
* 'House of Cards' - Solution being explored.

Overview:
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