const { assert, expect } = require("chai");
const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const setup = require("./lib/setup");
const constants = require("./lib/constants");
const { parseEther, formatEther } = require("ethers/lib/utils");
const { ONE_ETHER, MILLION_ETHER } = constants.VALUES;
const UniswapV2Pair = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const UniswapV2Factory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const UniswapV2Router02 = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const batchApproval = require("./lib/batchApproval");
const Option = require("../artifacts/Option.json");
const Redeem = require("../artifacts/Redeem.json");
const ERC20 = require("../artifacts/ERC20.json");
const { ethers } = require("ethers");

/**
 * @dev Gets the contract instance of a contract using its name.
 * @param {*} contractName The contract name `contract NAME {}`.
 * @param {*} signer The ethers js Signer object to call the transaction.
 * @return Contract instance.
 */
const getInstance = async (contractName, signer) => {
    const contract = await deployments.get(contractName);
    const instance = new ethers.Contract(
        contract.address,
        contract.abi,
        signer
    );
    return instance;
};

describe("UniswapConnector Flash for Rinkeby", () => {
    // ACCOUNTS
    let Admin, User, Alice;

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
        weth = await getInstance("WETH9", Admin);
        dai = await getInstance("USDC", Admin);
        quoteToken = dai;

        // Administrative contract instances
        registry = await getInstance("Registry", Admin);

        // Uniswap V2
        uniswapFactory = new ethers.Contract(
            constants.ADDRESSES.RINKEBY_UNI_FACTORY,
            UniswapV2Factory.abi,
            Admin
        );
        uniswapRouter = new ethers.Contract(
            constants.ADDRESSES.RINKEBY_UNI_ROUTER02,
            UniswapV2Router02.abi,
            Admin
        );

        // Option parameters
        underlyingToken = weth;
        strikeToken = dai;
        base = parseEther("1");
        quote = parseEther("100");
        expiry = "1690868800"; // May 30, 2020, 8PM UTC

        // Option and redeem instances
        let optionAddress = await registry.getOptionAddress(
            underlyingToken.address,
            strikeToken.address,
            base,
            quote,
            expiry
        );

        if (optionAddress === constants.ADDRESSES.ZERO_ADDRESS) {
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
        } else {
            console.log(optionAddress);
            optionToken = new ethers.Contract(optionAddress, Option.abi, Admin);
            redeemToken = new ethers.Contract(
                await optionToken.redeemToken(),
                Redeem.abi,
                Admin
            );
        }

        // Trader Instance
        trader = await getInstance("Trader", Admin);

        // Uniswap Connector contract
        uniswapConnector = await getInstance("UniswapConnector02", Admin);

        // Approve all tokens and contracts
        await batchApproval(
            [trader.address, uniswapConnector.address, uniswapRouter.address],
            [underlyingToken, strikeToken, optionToken, redeemToken],
            [Admin]
        );

        // Create UNISWAP PAIRS
        // option <> dai: 1:10 ($10 option) 1,000 options and 10,000 dai (1,000 weth)
        // redeem <> weth: 100:1 ($1 redeem) 100,000 redeems and 1,000 weth

        const totalOptions = parseEther("0.25");
        const daiForOptionsPair = parseEther("2.5");
        const totalDai = parseEther("210");
        const totalWethForPair = parseEther("0.25");
        const totalRedeemForPair = parseEther("25");

        // MINT 2,010 WETH
        await weth.deposit({ from: Alice, value: parseEther("0.5") });

        // MINT 1,000 OPTIONS
        await trader.safeMint(optionToken.address, totalOptions, Alice);

        // MINT 210,000 DAI
        await dai.mint(Alice, totalDai);

        // regular deadline
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Add liquidity to redeem <> weth   pair
        console.log(
            redeemToken.address,
            weth.address,
            totalRedeemForPair.toString(),
            totalWethForPair.toString(),
            0,
            0,
            Alice,
            deadline.toString()
        );
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
    });

    describe("openFlashLong", () => {
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
            let amountOptions = parseEther("0.1");
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
            console.log(
                optionToken.address,
                amountOptions.toString(),
                amountOutMin.toString()
            );

            let optionTest = new ethers.Contract(
                "0x05b8dAD398d12d2bd36e1a38e97c3692e7fAFcec",
                Option.abi,
                Admin
            );
            let underlyingTest = new ethers.Contract(
                await optionTest.getUnderlyingTokenAddress(),
                ERC20.abi,
                Admin
            );
            let redeemTest = new ethers.Contract(
                await optionTest.redeemToken(),
                Redeem.abi,
                Admin
            );
            let pairAddress = await uniswapFactory.getPair(
                redeemTest.address,
                underlyingTest.address
            );

            let underlyingAllowance = await underlyingTest.allowance(
                Alice,
                uniswapConnector.address
            );

            let amountsTest = await uniswapRouter.getAmountsOut(
                parseEther("0.00001").mul(quote).div(base),
                [redeemTest.address, underlyingTest.address]
            );

            console.log(
                `option: ${optionTest.address}, 
                underlying: ${underlyingTest.address}, 
                redeem: ${redeemTest.address}, 
                pair: ${pairAddress},
                underlyingAllowance: ${formatEther(underlyingAllowance)}
                amounts: ${
                    (amountsTest[0].toString(), amountsTest[1].toString())
                }`
            );

            await uniswapConnector.openFlashLong(
                "0x05b8dAD398d12d2bd36e1a38e97c3692e7fAFcec",
                "1000000",
                "0"
            );
            /* await uniswapConnector.openFlashLong(
                optionToken.address,
                amountOptions,
                amountOutMin
            ); */
            /* await expect(
                uniswapConnector.openFlashLong(
                    optionToken.address,
                    amountOptions,
                    amountOutMin
                )
            )
                .to.emit(uniswapConnector, "FlashOpened")
                .withArgs(uniswapConnector.address, amountOptions, remainder); */

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
