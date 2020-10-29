const { assert, expect } = require("chai");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const utils = require("./lib/utils");
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { parseEther, formatEther } = require("ethers/lib/utils");
const { assertBNEqual } = utils;
const {
    ONE_ETHER,
    TEN_ETHER,
    HUNDRED_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
} = constants.VALUES;
const UniswapV2Pair = require("@uniswap/v2-core/build/UniswapV2Pair.json");

describe("UniswapConnector Flash", () => {
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
        quote = parseEther("100");
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

        // Initialize the uniswap connector with addresses
        await uniswapConnector.initialize(
            uniswapRouter.address,
            uniswapFactory.address,
            trader.address,
            registry.address,
            quoteToken.address
        );

        // Approve tokens to be sent to trader contract
        await underlyingToken
            .connect(Admin)
            .approve(trader.address, MILLION_ETHER);
        await strikeToken.connect(Admin).approve(trader.address, MILLION_ETHER);
        await optionToken.connect(Admin).approve(trader.address, MILLION_ETHER);
        await redeemToken.connect(Admin).approve(trader.address, MILLION_ETHER);

        // Approve tokens to be sent to uniswapConnector
        await underlyingToken
            .connect(Admin)
            .approve(uniswapConnector.address, MILLION_ETHER);
        await strikeToken
            .connect(Admin)
            .approve(uniswapConnector.address, MILLION_ETHER);
        await optionToken
            .connect(Admin)
            .approve(uniswapConnector.address, MILLION_ETHER);
        await redeemToken
            .connect(Admin)
            .approve(uniswapConnector.address, MILLION_ETHER);

        // Approve tokens to be sent to uniswapRouter
        await underlyingToken
            .connect(Admin)
            .approve(uniswapRouter.address, MILLION_ETHER);
        await strikeToken
            .connect(Admin)
            .approve(uniswapRouter.address, MILLION_ETHER);
        await optionToken
            .connect(Admin)
            .approve(uniswapRouter.address, MILLION_ETHER);
        await redeemToken
            .connect(Admin)
            .approve(uniswapRouter.address, MILLION_ETHER);

        // Create UNISWAP PAIRS
        // option <> dai: 1:10 ($10 option) 1,000 options and 10,000 dai (1,000 weth)
        // redeem <> weth: 100:1 ($1 redeem) 100,000 redeems and 1,000 weth

        const totalOptions = parseEther("1000");
        const daiForOptionsPair = parseEther("100000");
        const totalDai = parseEther("210000");
        const totalWethForPair = parseEther("1000");
        const totalRedeemForPair = parseEther("100000");

        // MINT 2,010 WETH
        await weth.deposit({ from: Alice, value: parseEther("2500") });

        // MINT 1,000 OPTIONS
        await trader.safeMint(optionToken.address, totalOptions, Alice);

        // Mint some options for tests
        await trader.safeMint(optionToken.address, parseEther("10"), Alice);

        // MINT 210,000 DAI
        await dai.mint(Alice, totalDai);

        // regular deadline
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Add liquidity to option <> dai pair
        await uniswapRouter.addLiquidity(
            optionToken.address,
            dai.address,
            totalOptions,
            daiForOptionsPair,
            0,
            0,
            Alice,
            deadline
        );

        // Add liquidity to redeem <> weth   pair
        await uniswapRouter.addLiquidity(
            redeemToken.address,
            weth.address,
            totalRedeemForPair,
            totalWethForPair,
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

    /* describe("flashloanMintShortOptionsThenSwap", () => {
        it("sends to mimic a flash loan", async () => {
            let pairAddress = await uniswapFactory.getPair(
                quoteToken.address,
                underlyingToken.address
            );
            let flashLoanQuantity = ONE_ETHER;
            let amountOutMin = "0";
            let path = [
                redeemToken.address,
                dai.address,
                underlyingToken.address,
            ];
            let to = Alice;
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            // send in underlyingTokens as if was flash swap
            await underlyingToken.transfer(
                uniswapConnector.address,
                flashLoanQuantity
            );
            await expect(
                uniswapConnector.flashloanMintShortOptionsThenSwap(
                    pairAddress,
                    optionToken.address,
                    flashLoanQuantity,
                    amountOutMin,
                    path,
                    to,
                    deadline
                )
            )
                .to.emit(uniswapConnector, "FlashedShortOption")
                .withArgs(Alice, flashLoanQuantity);
        });
    }); */

    describe("openFlashShort", () => {
        it("gets a flash loan for underlyings, mints options, swaps redeem to underlyings to pay back", async () => {
            // Create a Uniswap V2 Pair and add liquidity.
            console.log(
                `Redeem balance: ${formatEther(
                    await redeemToken.balanceOf(Alice)
                )}`
            );

            console.log(
                `Option balance: ${formatEther(
                    await optionToken.balanceOf(Alice)
                )}`
            );

            console.log(
                `redeem dai pair: ${await uniswapFactory.getPair(
                    redeemToken.address,
                    dai.address
                )}`
            );

            console.log(
                `dai weth pair: ${await uniswapFactory.getPair(
                    weth.address,
                    dai.address
                )}`
            );

            // Get the pair instance to approve it to the uniswapConnector
            assert.equal(
                quoteToken.address,
                await uniswapConnector.quoteToken(),
                "QuoteToken mismatch"
            );
            let amountOptions = ONE_ETHER;
            let amountOutMin = "0";
            await uniswapConnector.openFlashShort(
                amountOptions,
                amountOutMin,
                optionToken.address
            );
        });
    });
});
