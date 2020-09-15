const { assert, expect } = require("chai");
const utils = require("./lib/utils");
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { parseEther, formatEther } = require("ethers/lib/utils");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { assertBNEqual, verifyOptionInvariants, getTokenBalance } = utils;
const {
    newUniswapTrader,
    newUniswapRinkeby,
    newUniswap,
    newWallets,
    newERC20,
    newWeth,
    newRegistry,
    newBadERC20,
    newTestRedeem,
    newTestOption,
    newOptionFactory,
    newPrimitive,
    newTrader,
    newUniswapConnector,
    UniswapRouter,
    newOption,
    newRedeem,
} = setup;
const {
    ONE_ETHER,
    FIVE_ETHER,
    TEN_ETHER,
    HUNDRED_ETHER,
    THOUSAND_ETHER,
    MILLION_ETHER,
} = constants.VALUES;

const {
    ERR_BAL_UNDERLYING,
    ERR_ZERO,
    ERR_BAL_STRIKE,
    ERR_BAL_OPTIONS,
    ERR_BAL_REDEEM,
    ERR_NOT_EXPIRED,
} = constants.ERR_CODES;

describe("UniswapConnector", () => {
    // ACCOUNTS
    let signers, Admin, User, Alice, Bob;

    let trader, weth, dai, optionToken, redeemToken;
    let underlyingToken, strikeToken;
    let base, quote, expiry;
    let Primitive, registry;
    let uniswapFactory, uniswapRouter, uniswapConnector;
    let uniswapTrader;

    before(async () => {
        signers = await newWallets();
        Admin = signers[0];
        User = signers[1];
        Alice = Admin._address;
        Bob = User._address;
        weth = await newWeth(Admin);
        dai = await newERC20(Admin, "TEST DAI", "DAI", MILLION_ETHER);
        registry = await newRegistry(Admin);
        factoryOption = await newOptionFactory(Admin, registry);
        const uniswap = await newUniswap(Admin, Alice, weth);
        uniswapFactory = uniswap.uniswapFactory;
        uniswapRouter = uniswap.uniswapRouter;
        console.log(uniswapFactory.address, uniswapRouter.address);
        uniswapTrader = await newUniswapTrader(Admin, dai, uniswapRouter);

        await weth.deposit({ from: Alice, value: HUNDRED_ETHER });
        underlyingToken = weth;
        strikeToken = dai;
        base = parseEther("1");
        quote = parseEther("200");
        expiry = "1690868800"; // May 30, 2020, 8PM UTC

        Primitive = await newPrimitive(
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
        trader = await newTrader(Admin, weth.address);

        // setup the uniswap connector
        uniswapConnector = await newUniswapConnector(Admin);
        await uniswapConnector.setUniswapProtocol(
            uniswapRouter.address,
            uniswapFactory.address,
            true
        );
        await uniswapConnector.setPrimitiveProtocol(
            trader.address,
            registry.address,
            true
        );
        await uniswapConnector.setQuoteToken(dai.address);

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

        await uniswapFactory.createPair(optionToken.address, dai.address);
        await trader.safeMint(optionToken.address, TEN_ETHER, Alice);
        await uniswapRouter.addLiquidity(
            optionToken.address,
            dai.address,
            TEN_ETHER,
            HUNDRED_ETHER,
            0,
            0,
            Alice,
            await uniswapTrader.getMaxDeadline()
        );
    });

    describe("Constructor", () => {
        it("should return the correct weth address", async () => {
            expect(await trader.weth()).to.be.equal(weth.address);
        });
    });

    describe("mintAndMarketSell", () => {
        it("should mint then market sell", async () => {
            const pair = await uniswapFactory.getPair(
                optionToken.address,
                dai.address
            );
            let balanceBefore = await dai.balanceOf(Alice);
            let optionBalanceBefore = await optionToken.balanceOf(pair);
            await expect(
                uniswapConnector.mintAndMarketSell(
                    optionToken.address,
                    ONE_ETHER,
                    1
                )
            )
                .to.emit(uniswapConnector, "UniswapTraderSell")
                .withArgs(Alice, Alice, optionToken.address, ONE_ETHER);
            let balanceAfter = await dai.balanceOf(Alice);
            let optionBalanceAfter = await optionToken.balanceOf(pair);
            let balanceDelta = balanceAfter.sub(balanceBefore).toString();
            let balanceOptionDelta = optionBalanceAfter
                .sub(optionBalanceBefore)
                .toString();
            console.log(
                balanceBefore.toString(),
                balanceAfter.toString(),
                balanceDelta,
                balanceOptionDelta
            );
        });
    });

    describe("rollOption()", () => {
        it("should roll option 1 (shorter expiry) to option 2 (longer expiry)", async () => {
            let shortOption = optionToken.address;
            let longerExpiry = "1690868900";
            let longOptionToken = await newOption(
                Admin,
                registry,
                underlyingToken.address,
                strikeToken.address,
                base,
                quote,
                longerExpiry
            );
            let longOption = longOptionToken.address;
            let shortRedeemToken = await newRedeem(Admin, optionToken);

            await longOptionToken
                .connect(Admin)
                .approve(uniswapConnector.address, MILLION_ETHER);
            await shortRedeemToken
                .connect(Admin)
                .approve(uniswapConnector.address, MILLION_ETHER);

            await trader.safeMint(optionToken.address, ONE_ETHER, Alice);

            let balanceOfShortOption1 = await optionToken.balanceOf(Alice);
            let balanceOfLongOption1 = await longOptionToken.balanceOf(Alice);
            await expect(
                uniswapConnector.rollOption(
                    shortOption,
                    longOption,
                    Alice,
                    ONE_ETHER
                )
            )
                .to.emit(uniswapConnector, "RolledOptions")
                .withArgs(Alice, shortOption, longOption, ONE_ETHER);
            let balanceOfShortOption2 = await optionToken.balanceOf(Alice);
            let balanceOfLongOption2 = await longOptionToken.balanceOf(Alice);
            console.log(
                formatEther(balanceOfShortOption1),
                formatEther(balanceOfLongOption1)
            );
            console.log(
                formatEther(balanceOfShortOption2),
                formatEther(balanceOfLongOption2)
            );
        });
    });

    describe("addLiquidityWithOptions", () => {
        it("should add liquidity with options and quote tokens to a uniswap market", async () => {
            await expect(
                uniswapConnector.addLiquidityWithOptions(
                    optionToken.address,
                    ONE_ETHER
                )
            )
                .to.emit(uniswapConnector, "AddedLiquidity")
                .withArgs(Alice, optionToken.address, ONE_ETHER);
        });
    });
});
