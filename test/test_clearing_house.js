// Testing suite tools
const { expect, use } = require("chai");
const { solidity } = require("ethereum-waffle");
use(solidity);

// Convert to wei
const { parseEther, formatEther } = require("ethers/lib/utils");

// Helper functions and constants
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const BalanceTable = require("./lib/balanceTable");
const { ONE_ETHER, TEN_ETHER, MILLION_ETHER } = constants.VALUES;
const { ERR_ZERO } = constants.ERR_CODES;

const config = {};
const table = new BalanceTable(config);

describe("ClearingHouse", () => {
    // Accounts
    let Admin, User, Alice;

    // Tokens
    let weth, dai, optionToken;

    // Option Parameters
    let underlyingToken, strikeToken, base, quote, expiry;

    // Periphery and Administrative contracts
    let registry, flash;

    before(async () => {
        let signers = await setup.newWallets();

        // Signers
        Admin = signers[0];
        User = signers[1];

        // Addresses of Signers
        Alice = Admin._address;
        Bob = User._address;

        // Underlying and quote token instances
        weth = await setup.newWeth(Admin);
        dai = await setup.newERC20(Admin, "TEST DAI", "DAI", MILLION_ETHER);
        await weth.deposit({ value: TEN_ETHER });

        // Administrative contract instances
        registry = await setup.newRegistry(Admin);

        // Option Parameters
        underlyingToken = weth;
        strikeToken = dai;
        base = parseEther("1").toString();
        quote = parseEther("300").toString();
        expiry = "1790868800";

        // Option and Redeem token instances for parameters
        Primitive = await setup.newPrimitive(
            Admin,
            registry,
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );

        optionToken = Primitive.optionToken;
        redeemToken = Primitive.redeemToken;

        // Setup clearing house contract
        [clearingHouse] = await setup.setupMultipleContracts(["ClearingHouse"]);
        await clearingHouse.initializeSelf(registry.address);

        // Setup synthetic tokens
        [
            syntheticUnderlying,
            syntheticStrike,
        ] = await setup.setupMultipleContracts(["SERC20", "SERC20"]);

        // Add synthetic tokens to clearing house
        await clearingHouse.addSyntheticToken(
            underlyingToken.address,
            syntheticUnderlying.address
        );
        await clearingHouse.addSyntheticToken(
            strikeToken.address,
            syntheticStrike.address
        );

        // Deploy a synthetic option on the main test option
        syntheticOption = await setup.newSyntheticOption(
            Admin,
            optionToken.address,
            clearingHouse
        );

        // Approve all the tokens for the clearing house
        let arrayOfContracts = [clearingHouse];
        let arrayOfTokens = [
            underlyingToken,
            strikeToken,
            optionToken,
            redeemToken,
            syntheticOption,
        ];
        let arrayOfOwners = [Admin, User];
        await setup.batchApproval(
            arrayOfContracts,
            arrayOfTokens,
            arrayOfOwners
        );
    });

    describe("syntheticMint()", () => {
        it("mints a synthetic option using real underlying tokens", async () => {
            let option = optionToken.address;
            let quantity = ONE_ETHER;
            let receiver = Alice;

            /* await expect(() =>
                optionToken.transfer(Alice, 200)
            ).to.changeTokenBalance(optionToken, Alice, 200);

            await expect(() =>
                clearingHouse.syntheticMint(option, quantity, receiver)
            )
                .to.changeTokenBalance(
                    underlyingToken.address,
                    Alice,
                    quantity.mul(-1)
                )
                .and.to.emit(clearingHouse, "SyntheticMinted")
                .withArgs(receiver, option, quantity); */

            await expect(
                clearingHouse.syntheticMint(option, quantity, receiver)
            )
                .to.emit(clearingHouse, "SyntheticMinted")
                .withArgs(receiver, option, quantity);

            let syntheticOptionBal = await syntheticOption.balanceOf(receiver);
            let underlyingTokenBal = await underlyingToken.balanceOf(
                clearingHouse.address
            );

            console.log(
                "You have: ",
                formatEther(syntheticOptionBal),
                await syntheticOption.symbol(),
                "and the clearing house has: ",
                formatEther(underlyingTokenBal),
                await underlyingToken.symbol()
            );
        });
    });

    describe("openDebitSpread()", () => {
        it("mints an option using an option as collateral", async () => {
            // mint some long synthetic option tokens
            await clearingHouse.syntheticMint(
                optionToken.address,
                ONE_ETHER,
                Alice
            );

            // Option Parameters
            underlyingToken = weth;
            strikeToken = dai;
            base = parseEther("1").toString();
            quote = parseEther("500").toString();
            expiry = "1790868800";

            // Option and Redeem token instances for parameters
            let newPrimitive = await setup.newPrimitive(
                Admin,
                registry,
                underlyingToken,
                strikeToken,
                base,
                quote,
                expiry
            );

            shortOptionToken = newPrimitive.optionToken;
            shortRedeemToken = newPrimitive.redeemToken;

            syntheticShortOption = await setup.newSyntheticOption(
                Admin,
                shortOptionToken.address,
                clearingHouse
            );
            syntheticShortOptionRedeemToken = await setup.newRedeem(
                Admin,
                syntheticShortOption
            );

            let longOption = optionToken.address;
            let shortOption = shortOptionToken.address;
            let quantity = ONE_ETHER;
            let receiver = Alice;
            await expect(
                clearingHouse.openDebitSpread(
                    longOption,
                    shortOption,
                    quantity,
                    receiver
                )
            )
                .to.emit(clearingHouse, "OpenedDebitSpread")
                .withArgs(receiver, longOption, shortOption, quantity);

            let syntheticOptionBal = await syntheticShortOption.balanceOf(
                receiver
            );
            let underlyingTokenBal = await syntheticOption.balanceOf(
                clearingHouse.address
            );

            console.log(
                "You have: ",
                formatEther(syntheticOptionBal),
                await syntheticShortOption.symbol(),
                "with a strike price of",
                formatEther(await syntheticShortOption.getQuoteValue()),
                "and the clearing house has: ",
                formatEther(underlyingTokenBal),
                await syntheticOption.symbol(),
                "with a strike price of",
                formatEther(await syntheticOption.getQuoteValue()),
                `and ${formatEther(
                    await syntheticShortOptionRedeemToken.balanceOf(Alice)
                )} ${await syntheticShortOptionRedeemToken.symbol()}, while the clearing house has 
                ${formatEther(
                    await syntheticShortOptionRedeemToken.balanceOf(
                        clearingHouse.address
                    )
                )} ${await syntheticShortOptionRedeemToken.symbol()}
                `
            );

            const contractNamesArray = ["Alice", "Clearing House"];
            const contractsArray = [Alice, clearingHouse.address];
            const tokensArray = [
                underlyingToken,
                strikeToken,
                optionToken,
                redeemToken,
                syntheticOption,
                syntheticShortOption,
                syntheticShortOptionRedeemToken,
            ];

            const info = await setup.formatConfigForBalanceReporter(
                contractNamesArray,
                contractsArray,
                tokensArray
            );

            console.log(info);
            table.generate(info);
        });
    });
});
