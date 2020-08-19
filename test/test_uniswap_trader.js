// Testing suite tools
const { expect } = require("chai");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

// Convert to wei
const { parseEther } = require("ethers/lib/utils");

// Helper functions and constants
const utils = require("./lib/utils");
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { assertBNEqual, getTokenBalance } = utils;
const { ONE_ETHER, TEN_ETHER, HUNDRED_ETHER, MILLION_ETHER } = constants.VALUES;
const { ERR_ZERO } = constants.ERR_CODES;

describe("UniswapTrader", () => {
    // Accounts
    let Admin, User, Alice, Bob;

    // Tokens
    let weth, dai, optionToken;

    // Option Parameters
    let underlyingToken, strikeToken, base, quote, expiry;

    // Periphery and Administrative contracts
    let registry, trader;

    // Uniswap contracts
    let uniswapFactory, uniswapRouter, uniswapTrader;

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

        // Administrative contract instances
        registry = await setup.newRegistry(Admin);

        // Uniswap contract instances
        const uniswap = await setup.newUniswap(Admin, Alice, weth);
        uniswapFactory = uniswap.uniswapFactory;
        uniswapRouter = uniswap.uniswapRouter;
        uniswapTrader = await setup.newUniswapTrader(Admin, dai, uniswapRouter);

        // Option Parameters
        await weth.deposit({ from: Alice, value: HUNDRED_ETHER });
        underlyingToken = weth;
        strikeToken = dai;
        base = parseEther("1").toString();
        quote = parseEther("200").toString();
        expiry = "1690868800";

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
        trader = await setup.newTrader(Admin, weth.address);
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
            trader = await setup.newTrader(Admin, weth.address);
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
