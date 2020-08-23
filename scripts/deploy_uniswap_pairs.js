const bre = require("@nomiclabs/buidler/config");
const { parseEther, formatEther, formatUnits } = require("ethers/lib/utils");
const { checkInitialization } = require("../test/lib/utils");
const USDC = require("../deployments/rinkeby/USDC");
const ETH = require("../deployments/rinkeby/ETH");
const UniswapV2Router02 = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const UniswapV2Pair = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const UniswapV2Factory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const ERC20 = require("../artifacts/ERC20");
const Option = require("../artifacts/Option");
const { ADDRESSES } = require("../test/lib/constants");
const { RINKEBY_UNI_ROUTER02, RINKEBY_UNI_FACTORY, ZERO_ADDRESS } = ADDRESSES;
const fs = require("fs");
const optionsDeployments = require("../options_deployments.json");

/**
 * @dev If the allowance of an account is less than some large amount, approve a large amount.
 * @param {*} signer The signer account calling the transaction.
 * @param {*} spender The signer account that should be approved.
 * @param {*} token The ERC-20 token to update its allowance mapping.
 */
const checkAllowance = async (signer, spender, token) => {
    const amount = parseEther("10000000000");
    const owner = await signer.getAddress();
    let allowance = await token.allowance(owner, spender.address);
    if (allowance <= amount) {
        await token.connect(signer).approve(spender.address, amount);
    }
};

const getOptionDeploymentAddresses = () => {
    let objectKeysArray = Object.keys(optionsDeployments);
    let optionAddressArray = [];
    for (let i = 0; i < objectKeysArray.length; i++) {
        let key = objectKeysArray[i];
        let optionObject = optionsDeployments[key];
        optionAddressArray.push(optionObject.address);
    }
    return optionAddressArray;
};

const writeUniswapJson = (optionJsonObject) => {
    let data = JSON.stringify(optionJsonObject, null, 2);
    fs.writeFileSync("./uniswap_pairs.json", data);
};

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

const getERC20Instance = async (contractAddress, signer) => {
    const instance = new ethers.Contract(contractAddress, USDC.abi, signer);
    return instance;
};

/**
 * @dev Gets a UniswapV2Pair pool for the option address and another token.
 * @notice If the pair is address zero, it will create the pair.
 * @param {*} optionAddress The address of the option contract clone to create a pair for.
 * @return The address of the newly created pair.
 */
const getUniswapV2Pair = async (optionAddress, tokenAddress) => {
    // Get the admin signer.
    const [signer] = await ethers.getSigners();

    // Get the contract instances.
    const uniswapFactory = new ethers.Contract(
        RINKEBY_UNI_FACTORY,
        UniswapV2Factory.abi,
        signer
    );

    // Create a new pair if it does not exist (equal to address zero).
    let pairAddress = await uniswapFactory.getPair(optionAddress, tokenAddress);
    if (pairAddress == ZERO_ADDRESS) {
        try {
            await uniswapFactory.createPair(optionAddress, tokenAddress);
        } catch (err) {
            console.log(err, "Creating pair error.");
        }
        pairAddress = await uniswapFactory.getPair(optionAddress, tokenAddress);
    }
    return pairAddress;
};

/**
 * @dev Adds liquidity to a uniswap V2 pair of the option token and a token.
 * @param optionAddress The address of the option contract.
 * @param tokenAddress The address of the paired token.
 * @returns pairAddress The address of the funded unsiwap pool.
 */
const addUniswapV2Liquidity = async (optionAddress, tokenAddress) => {
    // Get the admin signer.
    const [signer] = await ethers.getSigners();
    const account = await signer.getAddress();

    // Get the contract instances.
    const trader = await getInstance("Trader", signer);
    const uniswapTrader = await getInstance("UniswapTrader", signer);
    const usdcToken = await getInstance("USDC", signer);
    const ethToken = await getInstance("ETH", signer);
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

    // Approve the router.
    await checkAllowance(signer, uniswapRouter, usdcToken);
    await checkAllowance(signer, uniswapRouter, ethToken);
    // Approve the trader.
    await checkAllowance(signer, trader, usdcToken);
    await checkAllowance(signer, trader, ethToken);

    // Create a new pair if it does not exist (equal to address zero).
    let pairAddress = await getUniswapV2Pair(optionAddress, tokenAddress);

    // approve the router to take the option liquidity
    let optionTokenInstance = new ethers.Contract(
        optionAddress,
        USDC.abi,
        signer
    );
    try {
        console.log(
            await optionTokenInstance.allowance(
                await signer.getAddress(),
                uniswapRouter.address
            )
        );
    } catch (err) {
        console.log(err, "Allowance error.");
    }

    await checkAllowance(signer, uniswapRouter, optionTokenInstance);

    // Mint new options to add liquidity to uniswap pool.
    try {
        await usdcToken.mint(account, parseEther("10000"));
        await ethToken.mint(account, parseEther("10000"));
        await trader.safeMint(optionAddress, parseEther("1000"), account);
    } catch (err) {
        console.log(err, "Minting options error.");
    }

    // Add liquidity to Uniswap pool.
    try {
        await uniswapRouter.addLiquidity(
            optionAddress, // token 0
            tokenAddress, // token 1
            parseEther("1000"), // quantity of token 0
            parseEther("5000"), // quantity of token 1
            0, // min quantity of lp tokens
            0, // min quantity of lp tokens
            account, // lp token receiver
            await uniswapTrader.getMaxDeadline() // deadline until trade expires
        );
    } catch (err) {
        console.log(err, "Adding liquidity error.");
    }
    return pairAddress;
};

async function main() {
    const [signer] = await ethers.getSigners();
    let uniswapPairJsonObject = {};
    let optionAddressArray = getOptionDeploymentAddresses();
    let stablecoin = await getInstance("USDC", signer);
    // For each option object, get its address, deploy a uniswap pair for it an a stablecoin,
    // and save it to uniswap_pairs.json.
    for (let i = 0; i < optionAddressArray.length; i++) {
        let optionAddress = optionAddressArray[i];
        let pairAddress = await addUniswapV2Liquidity(
            optionAddress,
            stablecoin.address
        );
        Object.assign(uniswapPairJsonObject, {
            [Object.keys(optionsDeployments)[i]]: {
                optionAddress: optionAddress,
                stablecoinAddress: stablecoin.address,
                pairAddress: pairAddress,
            },
        });
    }

    writeUniswapJson(uniswapPairJsonObject);
    console.log(optionAddressArray);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
