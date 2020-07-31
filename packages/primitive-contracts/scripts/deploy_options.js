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
const UniswapV2Pair = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const UniswapV2Factory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const ERC20 = require("@primitivefi/contracts/artifacts/ERC20");
const { ADDRESSES, VALUES } = require("../test/lib/constants");
const { RINKEBY_UNI_ROUTER02, RINKEBY_UNI_FACTORY, ZERO_ADDRESS } = ADDRESSES;

async function checkAllowance(owner, spender, token) {
    const amount = parseEther("10000000000");
    let allowance = await token.allowance(owner, spender.address);
    if (allowance <= amount) {
        try {
            await token.approve(spender.address, amount, { from: owner });
        } catch (err) {
            console.log(err);
        }
    }
}

const getInstance = async (contractName, signer) => {
    const contract = await deployments.get(contractName);
    const instance = new ethers.Contract(contract.address, contract.abi, signer);
    return instance;
};

const deployOption = async () => {
    const [signer] = await ethers.getSigners();
    const account = await signer.getAddress();
    const registry = await getInstance("Registry");
    const optionFactory = await getInstance("OptionFactory");
    const redeemFactory = await getInstance("RedeemFactory");
    const trader = await getInstance("Trader");
    const uniswapTrader = await getInstance("UniswapTrader");
    const usdcToken = await getInstance("USDC");
    const ethToken = await getInstance("ETH");

    const uniswapFactory = new ethers.Contract(RINKEBY_UNI_FACTORY, UniswapV2Factory.abi, signer);
    const uniswapRouter = new ethers.Contract(RINKEBY_UNI_ROUTER02, UniswapV2Router02.abi, signer);

    // approve the router
    await checkAllowance(account, uniswapRouter, usdcToken);
    await checkAllowance(account, uniswapRouter, ethToken);
    // approve the trader
    await checkAllowance(account, trader, usdcToken);
    await checkAllowance(account, trader, ethToken);
    // option = [underlying, quotetoken, base, quote, expiry]
    let ETH_CALL_240 = [ETH.address, USDC.address, "1", "240", "1609286400"];
    let ETH_CALL_300 = [ETH.address, USDC.address, "1", "300", "1609286400"];
    let ETH_CALL_340 = [ETH.address, USDC.address, "1", "340", "1609286400"];
    let ETH_PUT_240 = [USDC.address, ETH.address, "240", "1", "1609286400"];
    let ETH_PUT_300 = [USDC.address, ETH.address, "300", "1", "1609286400"];
    let ETH_PUT_340 = [USDC.address, ETH.address, "340", "1", "1609286400"];
    let optionsArray = [
        ETH_CALL_240,
        /* ETH_CALL_300,
        ETH_CALL_340,
        ETH_PUT_240,
        ETH_PUT_300,
        ETH_PUT_340, */
    ];

    let transactionsArray = [];
    for (let i = 0; i < optionsArray.length; i++) {
        let index = i;
        let option = optionsArray[i];
        let underlying = option[0];
        let quoteToken = option[1];
        let base = parseEther(option[2]);
        let quote = parseEther(option[3]);
        let expiry = option[4];
        // check initialized and supported
        await checkSupported(registry, ethToken, usdcToken);
        await checkInitialization(registry, optionFactory, redeemFactory);
        // check if option has been deployed, and if not, deploy it
        let deployedOption = await registry.getOption(underlying, quoteToken, base, quote, expiry);
        // deploy an option
        let tx;
        if (deployedOption == ZERO_ADDRESS) {
            try {
                tx = await registry.deployOption(underlying, quoteToken, base, quote, expiry, { gasLimit: 1000000 });
            } catch (err) {
                console.log(err);
            }
            // get deployed option address
            deployedOption = await registry.getOption(underlying, quoteToken, base, quote, expiry);
        }

        // create a new pair
        let pairAddress = await uniswapFactory.getPair(deployedOption, usdcToken.address);
        if (pairAddress == ZERO_ADDRESS) {
            try {
                await uniswapFactory.createPair(deployedOption, USDC.address);
            } catch (err) {
                console.log(err);
            }
            pairAddress = await uniswapFactory.getPair(deployedOption, usdcToken.address);
        }

        let uniswapPair = new ethers.Contract(pairAddress, UniswapV2Pair.abi, signer);
        let liquidity = await uniswapPair.getReserves();
        let reserve0 = liquidity._reserve0;
        if (reserve0 == 0) {
            // approve the router to take the option liquidity
            let optionTokenInstance = new ethers.Contract(deployedOption, ERC20.abi, signer);
            await checkAllowance(account, uniswapRouter, optionTokenInstance);

            // mint new options
            try {
                await trader.safeMint(deployedOption, parseEther("100"), await signer.getAddress());
            } catch (err) {
                console.log(err);
            }

            // seed liquidity
            try {
                await uniswapRouter.addLiquidity(
                    deployedOption, // token 0
                    usdcToken.address, // token 1
                    parseEther("100"), // quantity of token 0
                    parseEther("500"), // quantity of token 1
                    0, // min quantity of lp tokens
                    0, // min quantity of lp tokens
                    await signer.getAddress(), // lp token receiver
                    await uniswapTrader.getMaxDeadline() // deadline until trade expires
                );
            } catch (err) {
                console.log(err);
            }
        }

        transactionsArray.push({ index, deployedOption, pairAddress });
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
