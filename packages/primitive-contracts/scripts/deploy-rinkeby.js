const bre = require("@nomiclabs/buidler/config");
const { checkSupported } = require("@primitivefi/contracts/tasks/lib/setup");
const { parseEther } = require("ethers/lib/utils");
const { checkInitialization } = require("../tasks/lib/utils");
const OptionFactory = require("@primitivefi/contracts/deployments/rinkeby/OptionFactory");
const RedeemFactory = require("@primitivefi/contracts/deployments/rinkeby/RedeemFactory");
const UniswapTrader = require("@primitivefi/contracts/deployments/rinkeby/UniswapTrader");
const Option = require("@primitivefi/contracts/artifacts/Option");
const Trader = require("@primitivefi/contracts/deployments/rinkeby/Trader");
const Registry = require("@primitivefi/contracts/deployments/rinkeby/Registry");
const USDC = require("@primitivefi/contracts/deployments/rinkeby/USDC");
const ETH = require("@primitivefi/contracts/deployments/rinkeby/ETH");
const UniswapV2Router02 = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const UniswapV2Factory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const { ADDRESSES, VALUES } = require("../test/lib/constants");
const { MILLION_ETHER } = VALUES;
const { RINKEBY_UNI_ROUTER02, RINKEBY_UNI_FACTORY, ZERO_ADDRESS } = ADDRESSES;

async function checkAllowance(owner, spender, token) {
    const amount = parseEther("10000000000");
    let allowance = await token.allowance(owner, spender.address);
    if (allowance <= amount) {
        await token.approve(spender.address, amount, { from: owner });
    }
}

const deployOption = async () => {
    const [signer] = await ethers.getSigners();
    const account = await signer.getAddress();
    const registry = new ethers.Contract(
        Registry.address,
        Registry.abi,
        signer
    );
    const optionFactory = new ethers.Contract(
        OptionFactory.address,
        OptionFactory.abi,
        signer
    );
    const redeemFactory = new ethers.Contract(
        RedeemFactory.address,
        RedeemFactory.abi,
        signer
    );
    const trader = new ethers.Contract(Trader.address, Trader.abi, signer);
    const uniswapTrader = new ethers.Contract(
        UniswapTrader.address,
        UniswapTrader.abi,
        signer
    );

    const usdcToken = new ethers.Contract(USDC.address, USDC.abi, signer);
    const ethToken = new ethers.Contract(ETH.address, ETH.abi, signer);

    const uniswapFactory = new ethers.Contract(
        RINKEBY_UNI_FACTORY,
        UniswapV2Factory.abi,
        signer
    );
    const uniswapRouter = new ethers.Contract(
        RINKEBY_UNI_ROUTER02,
        UniswapV2Router02.abi,
        signer
    );

    // approve the router
    await checkAllowance(account, uniswapRouter, usdcToken);
    await checkAllowance(account, uniswapRouter, ethToken);
    // approve the trader
    await checkAllowance(account, trader, usdcToken);
    await checkAllowance(account, trader, ethToken);
    // option = [underlying, quotetoken, base, quote, expiry]
    let ETH_CALL_250 = [ETH.address, USDC.address, "1", "250", "1609286400"];
    let ETH_CALL_300 = [ETH.address, USDC.address, "1", "300", "1609286400"];
    let ETH_CALL_350 = [ETH.address, USDC.address, "1", "350", "1609286400"];
    let ETH_PUT_250 = [USDC.address, ETH.address, "250", "1", "1609286400"];
    let ETH_PUT_300 = [USDC.address, ETH.address, "300", "1", "1609286400"];
    let ETH_PUT_350 = [USDC.address, ETH.address, "350", "1", "1609286400"];
    let optionsArray = [
        ETH_CALL_250,
        ETH_CALL_300,
        ETH_CALL_350,
        ETH_PUT_250,
        ETH_PUT_300,
        ETH_PUT_350,
    ];

    let transactionsArray = [];
    for (let i = 0; i < optionsArray.length; i++) {
        let option = optionsArray[i];
        let underlying = option[0];
        let quoteToken = option[1];
        let base = option[2];
        let quote = option[3];
        let expiry = option[4];
        // check initialized and supported
        await checkSupported(registry, ethToken, usdcToken);
        await checkInitialization(registry, optionFactory, redeemFactory);
        let deployedOption = await registry.getOption(
            underlying,
            quoteToken,
            base,
            quote,
            expiry
        );
        // deploy an option
        let tx;
        if (deployedOption == ZERO_ADDRESS) {
            tx = await registry.deployOption(
                underlying,
                quoteToken,
                parseEther(base),
                parseEther(quote),
                expiry,
                { gasLimit: 1000000 }
            );
        }

        // get deployed option address
        deployedOption = await registry.getOption(
            underlying,
            quoteToken,
            base,
            quote,
            expiry
        );

        // create a new pair
        let pairAddress = await uniswapFactory.getPair(
            deployedOption,
            usdcToken.address
        );
        if (pairAddress == ZERO_ADDRESS) {
            await uniswapFactory.createPair(deployedOption, USDC.address);
        }
        // get an option contract instance
        const optionInstance = new ethers.Contract(
            deployedOption,
            Option.abi,
            signer
        );
        // approve the router to take the option liquidity
        await optionInstance.approve(uniswapRouter.address, MILLION_ETHER);
        // mint new options
        await trader.safeMint(
            deployedOption,
            parseEther("100"),
            await signer.getAddress()
        );

        console.log(tx, deployedOption, pairAddress);
        // seed liquidity
        await uniswapRouter.addLiquidity(
            deployedOption,
            usdcToken.address,
            parseEther("100"),
            parseEther("500"),
            0,
            0,
            await signer.getAddress(),
            await uniswapTrader.getMaxDeadline()
        );
        // get pair address
        pairAddress = await uniswapFactory.getPair(
            deployedOption,
            usdcToken.address
        );
        transactionsArray.push({ tx, deployedOption, pairAddress });
    }

    return transactionsArray;
};

async function main() {
    let txs = await deployOption();
    console.log(txs);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
