const { assert, expect } = require("chai");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const utils = require("./lib/utils");
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { parseEther, formatEther } = require("ethers/lib/utils");
const { assertBNEqual } = utils;
const { ONE_ETHER, TEN_ETHER, HUNDRED_ETHER, MILLION_ETHER } = constants.VALUES;
const UniswapV2Pair = require("@uniswap/v2-core/build/UniswapV2Pair.json");

describe("UniswapConnector", () => {
    // ACCOUNTS
    let Admin, User, Alice, Bob;

    let trader, weth, dai, optionToken, redeemToken, quoteToken;
    let underlyingToken, strikeToken;
    let base, quote, expiry;
    let Primitive, registry;
    let uniswapFactory, uniswapRouter, uniswapConnector;

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
        quoteToken = dai;

        // Administrative contract instances
        registry = await setup.newRegistry(Admin);

        // Uniswap V2
        const uniswap = await setup.newUniswap(Admin, Alice, weth);
        uniswapFactory = uniswap.uniswapFactory;
        uniswapRouter = uniswap.uniswapRouter;

        // Uniswap Connector contract
        uniswapConnector = await setup.newUniswapConnector(Admin);

        // Option parameters
        underlyingToken = weth;
        strikeToken = dai;
        base = parseEther("1");
        quote = parseEther("200");
        expiry = "1690868800"; // May 30, 2020, 8PM UTC

        // Option and redeem instances
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

        // Trader Instance
        trader = await setup.newTrader(Admin, weth.address);

        // Initialize the uniswap connector
        await uniswapConnector.setRouter(uniswapRouter.address);
        await uniswapConnector.setFactory(uniswapFactory.address);
        await uniswapConnector.setTrader(trader.address);
        await uniswapConnector.setRegistry(registry.address);
        await uniswapConnector.setQuoteToken(quoteToken.address);

        // Mint some initial weth and approve instances to pull tokens.
        await weth.deposit({ from: Alice, value: HUNDRED_ETHER });

        await underlyingToken
            .connect(Admin)
            .approve(trader.address, MILLION_ETHER);
        await strikeToken.connect(Admin).approve(trader.address, MILLION_ETHER);
        await optionToken.connect(Admin).approve(trader.address, MILLION_ETHER);

        await underlyingToken
            .connect(Admin)
            .approve(uniswapConnector.address, MILLION_ETHER);
        await strikeToken
            .connect(Admin)
            .approve(uniswapConnector.address, MILLION_ETHER);
        await optionToken
            .connect(Admin)
            .approve(uniswapConnector.address, MILLION_ETHER);

        await underlyingToken
            .connect(Admin)
            .approve(uniswapRouter.address, MILLION_ETHER);
        await strikeToken
            .connect(Admin)
            .approve(uniswapRouter.address, MILLION_ETHER);
        await optionToken
            .connect(Admin)
            .approve(uniswapRouter.address, MILLION_ETHER);

        // Create a Uniswap V2 Pair and add liquidity.
        await trader.safeMint(optionToken.address, TEN_ETHER, Alice);
        //await uniswapFactory.createPair(optionToken.address, dai.address);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        await uniswapRouter.addLiquidity(
            optionToken.address,
            dai.address,
            TEN_ETHER,
            HUNDRED_ETHER,
            0,
            0,
            Alice,
            deadline
        );

        // Get the pair instance to approve it to the uniswapConnector
        let pairAddress = await uniswapFactory.getPair(
            optionToken.address,
            dai.address
        );
        let pair = new ethers.Contract(pairAddress, UniswapV2Pair.abi, Admin);
        await pair
            .connect(Admin)
            .approve(uniswapConnector.address, MILLION_ETHER);

        await pair
            .connect(User)
            .approve(uniswapConnector.address, MILLION_ETHER);
    });

    describe("setRouter", () => {
        it("should set the Router address and emit an event.", async () => {
            await expect(uniswapConnector.setRouter(uniswapRouter.address))
                .to.emit(uniswapConnector, "UpdatedRouter")
                .withArgs(Alice, uniswapRouter.address);
        });
    });

    describe("setFactory", () => {
        it("should set the Factory address and emit an event.", async () => {
            await expect(uniswapConnector.setFactory(uniswapFactory.address))
                .to.emit(uniswapConnector, "UpdatedFactory")
                .withArgs(Alice, uniswapFactory.address);
        });
    });

    describe("setTrader", () => {
        it("should set the Trader address and emit an event.", async () => {
            await expect(uniswapConnector.setTrader(trader.address))
                .to.emit(uniswapConnector, "UpdatedTrader")
                .withArgs(Alice, trader.address);
        });
    });

    describe("setRegistry", () => {
        it("should set the Registry address and emit an event.", async () => {
            await expect(uniswapConnector.setRegistry(registry.address))
                .to.emit(uniswapConnector, "UpdatedRegistry")
                .withArgs(Alice, registry.address);
        });
    });

    describe("setQuoteToken", () => {
        it("should set the QuoteToken address and emit an event.", async () => {
            await expect(uniswapConnector.setQuoteToken(quoteToken.address))
                .to.emit(uniswapConnector, "UpdatedQuoteToken")
                .withArgs(Alice, quoteToken.address);
        });
    });

    describe("mintOptionsThenSwapToTokens", () => {
        it("should mint Primitive V1 Options then swap them on Uniswap V2", async () => {
            // Get the pair address.
            let pair = await uniswapFactory.getPair(
                optionToken.address,
                dai.address
            );

            // Get the affected balances before the operation.
            let underlyingBalanceBefore = await underlyingToken.balanceOf(
                Alice
            );
            let quoteBalanceBefore = await quoteToken.balanceOf(Alice);
            let optionBalanceBefore = await optionToken.balanceOf(pair);

            /* Function ABI
                function mintOptionsThenSwapToTokens(
                    IOption optionToken,
                    uint256 amountIn,
                    uint256 amountOutMin,
                    address[] calldata path,
                    address to,
                    uint256 deadline
                ) external returns (bool) { 
            */
            let optionTokenAddress = optionToken.address;
            let amountIn = ONE_ETHER;
            let amountOutMin = 0;
            let path = [optionTokenAddress, quoteToken.address]; // path[0] MUST be the optionToken address.
            let to = Alice;
            let deadline = Math.floor(Date.now() / 1000) + 60 * 20;

            // Call the function
            await expect(
                uniswapConnector.mintOptionsThenSwapToTokens(
                    optionTokenAddress,
                    amountIn,
                    amountOutMin,
                    path,
                    to,
                    deadline
                )
            );

            let underlyingBalanceAfter = await underlyingToken.balanceOf(Alice);
            let quoteBalanceAfter = await quoteToken.balanceOf(Alice);
            let optionBalanceAfter = await optionToken.balanceOf(pair);

            // Used underlyings to mint options (Alice)
            let underlyingChange = underlyingBalanceAfter
                .sub(underlyingBalanceBefore)
                .toString();
            // Purchased quoteTokens with our options (Alice)
            let quoteChange = quoteBalanceAfter
                .sub(quoteBalanceBefore)
                .toString();
            // Sold options for quoteTokens to the pair, pair has more options (Pair)
            let optionChange = optionBalanceAfter
                .sub(optionBalanceBefore)
                .toString();

            assertBNEqual(underlyingChange, amountIn.mul(-1));
            /* expect(+(quoteChange.toString())).to.be.greaterThan(amountOutMin); */
            assertBNEqual(optionChange, amountIn);
        });
    });

    describe("rollOption()", () => {
        it("should roll option 1 (shorter expiry) to option 2 (longer expiry)", async () => {
            // Get the tokens needed

            // Use the current option as a shorter dated expiry option
            let rollFromOptionToken = optionToken;

            // Create a new option with a longer dated expiry
            let longerExpiry = "1690868900";
            let rollToOptionToken = await setup.newOption(
                Admin,
                registry,
                underlyingToken.address,
                strikeToken.address,
                base,
                quote,
                longerExpiry
            );
            let rollFromRedeemToken = await setup.newRedeem(
                Admin,
                rollFromOptionToken
            );

            // Approvals
            await rollToOptionToken
                .connect(Admin)
                .approve(uniswapConnector.address, MILLION_ETHER);
            await rollFromRedeemToken
                .connect(Admin)
                .approve(uniswapConnector.address, MILLION_ETHER);

            // Function parameters
            let rollFromOption = rollFromOptionToken.address;
            let rollToOption = rollToOptionToken.address;
            let rollQuantity = ONE_ETHER;
            let receiver = Alice;

            // Mint some options roll
            await trader.safeMint(rollFromOption, rollQuantity, receiver);

            // Get startning balances
            let rollFromOptionBalanceBefore = await rollFromOptionToken.balanceOf(
                Alice
            );
            let rollToOptionBalanceBefore = await rollToOptionToken.balanceOf(
                Alice
            );

            /* Function ABI
                function rollOption(
                    address rollFromOption,
                    address rollToOption,
                    uint256 rollQuantity,
                    address receiver
                ) external returns (bool) {
            */

            // Call the function
            await expect(
                uniswapConnector.rollOption(
                    rollFromOption,
                    rollToOption,
                    rollQuantity,
                    receiver
                )
            )
                .to.emit(uniswapConnector, "RolledOptions")
                .withArgs(Alice, rollFromOption, rollToOption, rollQuantity);

            // Get the new balances and calculate their differences
            let rollFromOptionBalanceAfter = await rollFromOptionToken.balanceOf(
                Alice
            );
            let rollToOptionBalanceAfter = await rollToOptionToken.balanceOf(
                Alice
            );

            let rollFromOptionBalanceChange = rollFromOptionBalanceAfter
                .sub(rollFromOptionBalanceBefore)
                .toString();
            let rollToOptionBalanceChange = rollToOptionBalanceAfter
                .sub(rollToOptionBalanceBefore)
                .toString();

            // Assert the balances changed appropriately
            assertBNEqual(rollFromOptionBalanceChange, rollQuantity.mul(-1));
            assertBNEqual(rollToOptionBalanceChange, rollQuantity);
        });
    });

    describe("rollOptionLiquidity()", () => {
        it("should roll option 1 (shorter expiry) to option 2 (longer expiry)", async () => {
            // Get the tokens needed

            // Use the current option as a shorter dated expiry option
            let rollFromOptionToken = optionToken;

            // Create a new option with a longer dated expiry
            let longerExpiry = "1690869900";
            let rollToOptionToken = await setup.newOption(
                Admin,
                registry,
                underlyingToken.address,
                strikeToken.address,
                base,
                quote,
                longerExpiry
            );
            let rollFromRedeemToken = await setup.newRedeem(
                Admin,
                rollFromOptionToken
            );

            // Approvals
            await rollToOptionToken
                .connect(Admin)
                .approve(uniswapConnector.address, MILLION_ETHER);
            await rollFromRedeemToken
                .connect(Admin)
                .approve(uniswapConnector.address, MILLION_ETHER);

            // Get the pair to track the LP share token balance
            let rollFromPairAddress = await uniswapFactory.getPair(
                rollFromOptionToken.address,
                quoteToken.address
            );
            let rollFromPair = new ethers.Contract(
                rollFromPairAddress,
                UniswapV2Pair.abi,
                Admin
            );

            // Function parameters
            let rollFromOption = rollFromOptionToken.address;
            let rollToOption = rollToOptionToken.address;
            let liquidity = await rollFromPair.balanceOf(Alice);
            console.log(formatEther(liquidity));
            let amountAMin = 0;
            let amountBMin = 0;
            let to = Alice;
            let deadline = Math.floor(Date.now() / 1000) + 60 * 20;

            // Create a pair for rolling liquidity to
            await uniswapConnector.deployUniswapMarket(rollToOption);

            // Get the pair with liquidity being rolled to
            let rollToPairAddress = await uniswapFactory.getPair(
                rollToOption,
                quoteToken.address
            );
            let rollToPair = new ethers.Contract(
                rollToPairAddress,
                UniswapV2Pair.abi,
                Admin
            );

            // Get startning balances
            let rollFromPairBalanceBefore = await rollFromPair.balanceOf(Alice);
            let rollToPairBalanceBefore = await rollToPair.balanceOf(Alice);

            /* Function ABI
                function rollOptionLiquidity(
                    address rollFromOption,
                    address rollToOption,
                    uint256 liquidity,
                    uint256 amountAMin,
                    uint256 amountBMin,
                    address to,
                    uint256 deadline
                ) external returns (bool) {
            */

            // Call the function
            await expect(
                uniswapConnector.rollOptionLiquidity(
                    rollFromOption,
                    rollToOption,
                    liquidity,
                    amountAMin,
                    amountBMin,
                    to,
                    deadline
                )
            )
                .to.emit(uniswapConnector, "RolledOptionLiquidity")
                .withArgs(Alice, rollFromOption, rollToOption, liquidity);

            // Get the new balances and calculate their differences
            let rollFromPairBalanceAfter = await rollFromPair.balanceOf(Alice);
            let rollToPairBalanceAfter = await rollToPair.balanceOf(Alice);

            let rollFromPairBalanceChange = rollFromPairBalanceAfter
                .sub(rollFromPairBalanceBefore)
                .toString();
            let rollToPairBalanceChange = rollToPairBalanceAfter
                .sub(rollToPairBalanceBefore)
                .toString();

            // Assert the balances changed appropriately
            assertBNEqual(rollFromPairBalanceChange, liquidity.mul(-1));
            //assertBNEqual(rollToPairBalanceChange, liquidity);
        });
    });

    describe("addLiquidityWithUnderlying", () => {
        it("use underlyings to mint options, then provide options and quote tokens as liquidity", async () => {
            /* Function ABI
                function addLiquidityWithUnderlying(
                    address optionAddress,
                    uint256 quantityOptions,
                    uint256 quantityQuoteTokens,
                    uint256 minQuantityOptions,
                    uint256 minQuantityQuoteTokens,
                    address to,
                    uint256 deadline
                ) public nonReentrant returns (bool) {
            */

            let optionAddress = optionToken.address;
            let quantityOptions = ONE_ETHER;
            let quantityQuoteTokens = ONE_ETHER;
            let minQuantityOptions = 0;
            let minQuantityQuoteTokens = 0;
            let to = Alice;
            let deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            await expect(
                uniswapConnector.addLiquidityWithUnderlying(
                    optionAddress,
                    quantityOptions,
                    quantityQuoteTokens,
                    minQuantityOptions,
                    minQuantityQuoteTokens,
                    to,
                    deadline
                )
            );
        });
    });

    describe("removeLiquidityThenCloseOptions", () => {
        it("burns UNI-V2 lp shares, then closes the withdrawn optionTokens", async () => {
            /* Function ABI
                function removeLiquidityThenCloseOptions(
                    address optionAddress,
                    uint256 liquidity,
                    uint256 amountAMin,
                    uint256 amountBMin,
                    address to,
                    uint256 deadline
                ) public nonReentrant returns (uint256, uint256) {
            */

            let optionAddress = optionToken.address;
            let liquidity = ONE_ETHER;
            let amountAMin = 0;
            let amountBMin = 0;
            let to = Alice;
            let deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            await expect(
                uniswapConnector.removeLiquidityThenCloseOptions(
                    optionAddress,
                    liquidity,
                    amountAMin,
                    amountBMin,
                    to,
                    deadline
                )
            );
        });
    });
});
