const { assert, expect } = require("chai");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const utils = require("./lib/utils");
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { parseEther, formatEther } = require("ethers/lib/utils");
const { assertBNEqual } = utils;
const { ONE_ETHER, MILLION_ETHER } = constants.VALUES;
const UniswapV2Pair = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const batchApproval = require("./lib/batchApproval");
const { sortTokens } = require("./lib/utils");

const _addLiquidity = async (
    router,
    reserves,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin
) => {
    let amount = [];
    let amountA, amountB;
    let amountBOptimal = await router.quote(
        amountADesired,
        reserves[0],
        reserves[1]
    );
    if (amountBOptimal <= amountBDesired) {
        assert.equal(
            amountBOptimal >= amountBMin,
            true,
            `${formatEther(amountBOptimal)} !>= ${formatEther(amountBMin)}`
        );

        [amountA, amountB] = [amountADesired, amountBOptimal];
    } else {
        let amountAOptimal = await router.quote(
            amountBDesired,
            reserves[1],
            reserves[0]
        );

        assert.equal(
            amountAOptimal >= amountAMin,
            true,
            `${formatEther(amountAOptimal)} !>= ${formatEther(amountAMin)}`
        );
        [amountA, amountB] = [amountAOptimal, amountBDesired];
    }

    return [amountA, amountB];
};

const getReserves = async (signer, factory, tokenA, tokenB) => {
    let tokens = sortTokens(tokenA, tokenB);
    let token0 = tokens[0];
    let pair = new ethers.Contract(
        await factory.getPair(tokenA, tokenB),
        UniswapV2Pair.abi,
        signer
    );
    let [_reserve0, _reserve1] = await pair.getReserves();

    let reserves =
        tokenA == token0 ? [_reserve0, _reserve1] : [_reserve1, _reserve0];
    return reserves;
};

describe("UniswapConnector", () => {
    // ACCOUNTS
    let Admin, User, Alice;

    let trader, weth, dai, optionToken, redeemToken, quoteToken;
    let underlyingToken, strikeToken;
    let base, quote, expiry;
    let Primitive, registry;
    let uniswapFactory, uniswapRouter, uniswapConnector;
    let premium;

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

        // Uniswap Connector contract
        uniswapConnector = await setup.newUniswapConnector(Admin, [
            uniswapRouter.address,
            uniswapFactory.address,
            trader.address,
        ]);

        // Approve all tokens and contracts
        await batchApproval(
            [trader.address, uniswapConnector.address, uniswapRouter.address],
            [underlyingToken, strikeToken, optionToken, redeemToken],
            [Admin]
        );

        // Create UNISWAP PAIRS
        // option <> dai: 1:10 ($10 option) 1,000 options and 10,000 dai (1,000 weth)
        // weth <> dai: 1:100 ($100 weth) 1,000 weth and 100,000 dai
        // redeem <> dai: 1:1 ($1 redeem) 100,000 redeems and 100,000 dai

        const totalOptions = parseEther("1000");
        const daiForOptionsPair = parseEther("100000");
        const totalDai = parseEther("210000");
        const totalWethForPair = parseEther("1000");
        const totalDaiForPair = parseEther("100000");
        const totalRedeemForPair = parseEther("100000");
        premium = 10;

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

        // Add liquidity to weth <> dai pair
        await uniswapRouter.addLiquidity(
            weth.address,
            dai.address,
            totalWethForPair,
            totalDaiForPair,
            0,
            0,
            Alice,
            deadline
        );

        // Add liquidity to redeem <> dai pair
        await uniswapRouter.addLiquidity(
            redeemToken.address,
            dai.address,
            totalRedeemForPair,
            totalDaiForPair,
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
        await batchApproval([uniswapConnector.address], [pair], [Admin, User]);
    });

    describe("mintLongOptionsThenSwapToTokens", () => {
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

            let optionTokenAddress = optionToken.address;
            let amountIn = ONE_ETHER;
            let path = [optionTokenAddress, quoteToken.address]; // path[0] MUST be the optionToken address.
            let amounts = await uniswapRouter.getAmountsOut(amountIn, path);
            let amountOutMin = amounts[path.length - 1];
            let to = Alice;
            let deadline = Math.floor(Date.now() / 1000) + 60 * 20;

            // Call the function
            await uniswapConnector.mintLongOptionsThenSwapToTokens(
                optionTokenAddress,
                amountIn,
                amountOutMin,
                path,
                to,
                deadline
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
            assert.equal(
                quoteChange >= amountOutMin,
                true,
                `quoteDelta ${quoteChange} != amountOutMin ${amountOutMin}`
            );
            assertBNEqual(optionChange, amountIn);
        });
    });

    describe("mintShortOptionsThenSwapToTokens", () => {
        it("should mint Primitive V1 Options then swap shortTokens on Uniswap V2", async () => {
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
            let redeemBalanceBefore = await redeemToken.balanceOf(pair);
            let optionTokenAddress = optionToken.address;
            let optionsToMint = ONE_ETHER;
            let amountIn = optionsToMint.mul(quote).div(base);
            let path = [redeemToken.address, quoteToken.address]; // path[0] MUST be the optionToken address.
            let amounts = await uniswapRouter.getAmountsOut(amountIn, path);
            let amountOutMin = amounts[path.length - 1];
            let to = Alice;
            let deadline = Math.floor(Date.now() / 1000) + 60 * 20;

            // Call the function
            await uniswapConnector.mintShortOptionsThenSwapToTokens(
                optionTokenAddress,
                optionsToMint,
                amountOutMin,
                path,
                to,
                deadline
            );

            let underlyingBalanceAfter = await underlyingToken.balanceOf(Alice);
            let quoteBalanceAfter = await quoteToken.balanceOf(Alice);
            let redeemBalanceAfter = await redeemToken.balanceOf(pair);

            // Used underlyings to mint options (Alice)
            let underlyingChange = underlyingBalanceAfter
                .sub(underlyingBalanceBefore)
                .toString();
            // Purchased quoteTokens with our options (Alice)
            let quoteChange = quoteBalanceAfter
                .sub(quoteBalanceBefore)
                .toString();
            // Sold options for quoteTokens to the pair, pair has more options (Pair)
            let redeemChange = redeemBalanceAfter
                .sub(redeemBalanceBefore)
                .toString();

            assertBNEqual(underlyingChange, optionsToMint.mul(-1));
            assertBNEqual(redeemChange, "0");
            assert.equal(
                quoteChange >= amountOutMin,
                true,
                `quoteDelta ${formatEther(
                    quoteChange
                )} != amountOutMin ${formatEther(amountOutMin)}`
            );
        });
    });

    describe("addLongLiquidityWithUnderlying", () => {
        it("use underlyings to mint options, then provide options and quote tokens as liquidity", async () => {
            console.log(
                `Weth balance: ${formatEther(await weth.balanceOf(Alice))}`
            );

            console.log(
                `Quote balance: ${formatEther(
                    await quoteToken.balanceOf(Alice)
                )}`
            );
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
                `Option balance of connector: ${formatEther(
                    await optionToken.balanceOf(uniswapConnector.address)
                )}`
            );

            let underlyingBalanceBefore = await underlyingToken.balanceOf(
                Alice
            );
            let quoteBalanceBefore = await quoteToken.balanceOf(Alice);

            let optionAddress = optionToken.address;
            let quantityOptions = ONE_ETHER;
            let quantityQuoteTokens = quantityOptions.mul(quote).div(base);
            let amountADesired = quantityOptions;
            let amountBDesired = quantityQuoteTokens;
            let amountAMin = amountADesired;
            let amountBMin = 0;
            let to = Alice;
            let deadline = Math.floor(Date.now() / 1000) + 60 * 20;

            let sortedTokens = utils.sortTokens(
                optionToken.address,
                quoteToken.address
            );
            let pairAddress = await uniswapFactory.getPair(
                sortedTokens[0],
                sortedTokens[1]
            );
            let pair = new ethers.Contract(
                pairAddress,
                UniswapV2Pair.abi,
                Admin
            );

            let [reserveA, reserveB] = await getReserves(
                Admin,
                uniswapFactory,
                optionToken.address,
                quoteToken.address
            );
            reserves = [reserveA, reserveB];

            let amountBOptimal = await uniswapRouter.quote(
                amountADesired,
                reserves[0],
                reserves[1]
            );

            console.log(formatEther(reserves[1]), formatEther(reserves[0]));
            let amountAOptimal = await uniswapRouter.quote(
                amountBDesired,
                reserves[1],
                reserves[0]
            );

            [, amountBMin] = await _addLiquidity(
                uniswapRouter,
                reserves,
                amountADesired,
                amountBDesired,
                amountAOptimal,
                amountBOptimal
            );
            //amountAMin = amounts[0].mul(995).div(1000).toString();
            //amountBMin = amounts[1].mul(995).div(1000).toString();
            console.log(
                `${formatEther(amountAMin)}, ${formatEther(
                    amountAOptimal
                )}, ${formatEther(amountBOptimal)},${formatEther(amountBMin)}`
            );
            await uniswapConnector.addLongLiquidityWithUnderlying(
                optionAddress,
                quoteToken.address,
                amountADesired,
                amountBDesired,
                amountAMin,
                amountBMin.mul(95).div(100),
                to,
                deadline
            );

            let underlyingBalanceAfter = await underlyingToken.balanceOf(Alice);
            let quoteBalanceAfter = await quoteToken.balanceOf(Alice);

            // Used underlyings to mint options (Alice)
            let underlyingChange = underlyingBalanceAfter.sub(
                underlyingBalanceBefore
            );

            // Purchased quoteTokens with our options (Alice)
            let quoteChange = quoteBalanceAfter.sub(quoteBalanceBefore);

            assertBNEqual(underlyingChange.toString(), amountADesired.mul(-1));
            assertBNEqual(quoteChange.toString(), amountBDesired.mul(-1));
            assert.equal(
                underlyingChange.mul(-1) <= amountAMin,
                true,
                `underlyingDelta ${formatEther(
                    underlyingChange
                )} != amountAMin ${formatEther(amountAMin)}`
            );
            assert.equal(
                quoteChange.mul(-1) >= amountBMin,
                true,
                `quoteDelta ${formatEther(
                    quoteChange
                )} != amountBMin ${formatEther(amountBMin)}`
            );

            console.log(
                `Underlying: ${formatEther(
                    underlyingChange
                )}, Quote: ${formatEther(quoteChange)}, amounts0 ${formatEther(
                    amountAMin
                )}, amounts1 ${formatEther(amountBMin)}`
            );

            console.log(
                `Weth balance: ${formatEther(await weth.balanceOf(Alice))}`
            );

            console.log(
                `Quote balance: ${formatEther(
                    await quoteToken.balanceOf(Alice)
                )}`
            );

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
                `Option balance of connector: ${formatEther(
                    await optionToken.balanceOf(uniswapConnector.address)
                )}`
            );
        });
    });

    describe("addShortLiquidityWithUnderlying", () => {
        it("use underlyings to mint options, then provide options and quote tokens as liquidity", async () => {
            /* Function ABI
                function addShortLiquidityWithUnderlying(
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
            await uniswapConnector.addShortLiquidityWithUnderlying(
                optionAddress,
                weth.address,
                quantityOptions,
                quantityQuoteTokens,
                minQuantityOptions,
                minQuantityQuoteTokens,
                to,
                deadline
            );
        });
    });

    describe("removeLongLiquidityThenCloseOptions", () => {
        it("burns UNI-V2 lp shares, then closes the withdrawn optionTokens", async () => {
            /* Function ABI
                function removeLongLiquidityThenCloseOptions(
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
            let pairAddress = await uniswapConnector.getUniswapMarketForTokens(
                optionToken.address,
                quoteToken.address
            );
            let pair = new ethers.Contract(
                pairAddress,
                UniswapV2Pair.abi,
                Admin
            );
            await pair
                .connect(Admin)
                .approve(uniswapConnector.address, MILLION_ETHER);
            assert.equal(
                (await pair.balanceOf(Alice)) >= liquidity,
                true,
                "err not enough pair tokens"
            );
            assert.equal(
                pairAddress != constants.ADDRESSES.ZERO_ADDRESS,
                true,
                "err pair not deployed"
            );
            let amountAMin = 0;
            let amountBMin = 0;
            let to = Alice;
            let deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            await uniswapConnector.removeLongLiquidityThenCloseOptions(
                optionAddress,
                quoteToken.address,
                liquidity,
                amountAMin,
                amountBMin,
                to,
                deadline
            );
        });
    });

    describe("removeShortLiquidityThenCloseOptions", () => {
        it("burns UNI-V2 lp shares, then closes the withdrawn optionTokens", async () => {
            /* Function ABI
                function removeShortLiquidityThenCloseOptions(
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
            let pairAddress = await uniswapConnector.getUniswapMarketForTokens(
                redeemToken.address,
                weth.address
            );
            let pair = new ethers.Contract(
                pairAddress,
                UniswapV2Pair.abi,
                Admin
            );
            await pair
                .connect(Admin)
                .approve(uniswapConnector.address, MILLION_ETHER);
            assert.equal(
                (await pair.balanceOf(Alice)) >= liquidity,
                true,
                "err not enough pair tokens"
            );
            assert.equal(
                pairAddress != constants.ADDRESSES.ZERO_ADDRESS,
                true,
                "err pair not deployed"
            );
            let amountAMin = 0;
            let amountBMin = 0;
            let to = Alice;
            let deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            await uniswapConnector.removeShortLiquidityThenCloseOptions(
                optionAddress,
                weth.address,
                liquidity,
                amountAMin,
                amountBMin,
                to,
                deadline
            );
        });
    });

    describe("openFlashLong", () => {
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

            // Uniswap Connector contract
            uniswapConnector = await setup.newUniswapConnector(Admin, [
                uniswapRouter.address,
                uniswapFactory.address,
                trader.address,
            ]);

            // Approve all tokens and contracts
            await batchApproval(
                [
                    trader.address,
                    uniswapConnector.address,
                    uniswapRouter.address,
                ],
                [underlyingToken, strikeToken, optionToken, redeemToken],
                [Admin]
            );

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
            let pair = new ethers.Contract(
                pairAddress,
                UniswapV2Pair.abi,
                Admin
            );
            await pair
                .connect(Admin)
                .approve(uniswapConnector.address, MILLION_ETHER);

            await pair
                .connect(User)
                .approve(uniswapConnector.address, MILLION_ETHER);
        });

        it("gets a flash loan for underlyings, mints options, swaps redeem to underlyings to pay back", async () => {
            // Create a Uniswap V2 Pair and add liquidity.
            console.log(
                `Weth balance: ${formatEther(await weth.balanceOf(Alice))}`
            );
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

            // Get the pair instance to approve it to the uniswapConnector
            let amountOptions = ONE_ETHER;
            let amountRedeems = amountOptions.mul(quote).div(base);
            let amountOutMin = "0";
            let amounts = await uniswapRouter.getAmountsOut(amountRedeems, [
                redeemToken.address,
                weth.address,
            ]);
            let remainder = amountOptions
                .mul(1000)
                .add(amountOptions.mul(3))
                .div(1000)
                .sub(amounts[1]);
            await expect(
                uniswapConnector.openFlashLong(
                    optionToken.address,
                    amountOptions,
                    amountOutMin
                )
            )
                .to.emit(uniswapConnector, "FlashOpened")
                .withArgs(uniswapConnector.address, amountOptions, remainder);

            console.log(
                `Weth balance: ${formatEther(await weth.balanceOf(Alice))}`
            );

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
        });
    });
});
