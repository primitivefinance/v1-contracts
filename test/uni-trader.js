const { assert, expect } = require("chai");
const utils = require("./lib/utils");
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { parseEther } = require("ethers/lib/utils");
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

describe("UniTrader", () => {
    // ACCOUNTS
    let signers, Admin, User, Alice, Bob;

    let trader, weth, dai, optionToken, redeemToken;
    let underlyingToken, strikeToken;
    let base, quote, expiry;
    let Primitive, registry;
    let uniswapFactory, uniswapRouter;
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
        await underlyingToken
            .connect(Admin)
            .approve(trader.address, MILLION_ETHER);
        await strikeToken.connect(Admin).approve(trader.address, MILLION_ETHER);
        await optionToken.connect(Admin).approve(trader.address, MILLION_ETHER);
        await underlyingToken
            .connect(Admin)
            .approve(uniswapTrader.address, MILLION_ETHER);
        await strikeToken
            .connect(Admin)
            .approve(uniswapTrader.address, MILLION_ETHER);
        await optionToken
            .connect(Admin)
            .approve(uniswapTrader.address, MILLION_ETHER);
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
                uniswapTrader.mintAndMarketSell(
                    optionToken.address,
                    ONE_ETHER,
                    1
                )
            )
                .to.emit(uniswapTrader, "UniswapTraderSell")
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

    describe("safeMint", () => {
        beforeEach(async () => {
            trader = await newTrader(Admin, weth.address);
            await underlyingToken
                .connect(Admin)
                .approve(trader.address, MILLION_ETHER);
            await strikeToken
                .connect(Admin)
                .approve(trader.address, MILLION_ETHER);

            safeMint = async (inTokenU) => {
                let outTokenR = inTokenU.mul(quote).div(base);

                let balanceU = await getTokenBalance(underlyingToken, Alice);
                let balanceP = await getTokenBalance(optionToken, Alice);
                let balanceR = await getTokenBalance(redeemToken, Alice);

                await expect(
                    trader.safeMint(optionToken.address, inTokenU, Alice)
                )
                    .to.emit(trader, "TraderMint")
                    .withArgs(
                        Alice,
                        optionToken.address,
                        inTokenU.toString(),
                        outTokenR.toString()
                    );

                let deltaU = (
                    await getTokenBalance(underlyingToken, Alice)
                ).sub(balanceU);
                let deltaP = (await getTokenBalance(optionToken, Alice)).sub(
                    balanceP
                );
                let deltaR = (await getTokenBalance(redeemToken, Alice)).sub(
                    balanceR
                );

                assertBNEqual(deltaU, inTokenU.mul(-1));
                assertBNEqual(deltaP, inTokenU);
                assertBNEqual(deltaR, outTokenR);
            };
        });

        it("should revert if amount is 0", async () => {
            await expect(
                trader.safeMint(optionToken.address, 0, Alice)
            ).to.be.revertedWith(ERR_ZERO);
        });
    });
});
