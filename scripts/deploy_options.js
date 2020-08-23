const bre = require("@nomiclabs/buidler/config");
const { parseEther, formatEther, formatUnits } = require("ethers/lib/utils");
const { checkInitialization } = require("../test/lib/utils");
const USDC = require("../deployments/rinkeby/USDC");
const ETH = require("../deployments/rinkeby/ETH");
const UniswapV2Router02 = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const UniswapV2Pair = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const UniswapV2Factory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const ERC20 = require("../artifacts/ERC20");
const { ADDRESSES } = require("../test/lib/constants");
const { RINKEBY_UNI_ROUTER02, RINKEBY_UNI_FACTORY, ZERO_ADDRESS } = ADDRESSES;
const { checkAllowance } = require("../test/lib/utils");
const fs = require("fs");

/**
 * @dev Checks the optionTemplate and redeemTemplate. If they are address zero, it will call deployTemplate().
 * @param {*} optionFactory The OptionFactory contract instance.
 * @param {*} redeemFactory The RedeemFactory contract instance.
 */
const checkTemplates = async (optionFactory, redeemFactory) => {
    const optionTemplate = await optionFactory.optionTemplate();
    const redeemTemplate = await redeemFactory.redeemTemplate();
    if (optionTemplate.toString() == ethers.constants.AddressZero.toString()) {
        await optionFactory.deployOptionTemplate();
    }
    if (redeemTemplate.toString() == ethers.constants.AddressZero.toString()) {
        await redeemFactory.deployRedeemTemplate();
    }
    return { optionTemplate, redeemTemplate };
};

const writeOptionJson = (optionJsonObject) => {
    let data = JSON.stringify(optionJsonObject, null, 2);
    fs.writeFileSync("./options.json", data);
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
 * @dev Function to validate argument data and create the correct data object.
 * @return optionParametersObject Returns an optionParametersObject.
 */
const getOptionParametersObject = (
    underlyingToken,
    strikeToken,
    base,
    quote,
    expiry
) => {
    const optionParametersObject = {
        underlyingToken: underlyingToken,
        strikeToken: strikeToken,
        base: parseEther(base),
        quote: parseEther(quote),
        expiry: expiry,
    };
    return optionParametersObject;
};

/**
 * @dev Concatenates a string of the option's symbol in the format:
 *      ASSET + YY + MM + DD + TYPE + STRIKE
 * @param {*} optionParametersObject The object with the option's parameters.
 * @returns An option's symbol according to its parameters.
 */
const getOptionSymbol = async (optionParametersObject) => {
    const [signer] = await ethers.getSigners();
    let underlyingInstance = await getERC20Instance(
        optionParametersObject.underlyingToken,
        signer
    );
    let underlyingSymbol = await underlyingInstance.symbol();
    let strikeInstance = await getERC20Instance(
        optionParametersObject.strikeToken,
        signer
    );
    let strikeSymbol = await strikeInstance.symbol();
    let base = formatEther(optionParametersObject.base);
    let quote = formatEther(optionParametersObject.quote);
    let expiry = optionParametersObject.expiry;
    let type;
    let strike;
    let asset;
    if (base == 1) {
        type = "C";
        strike = +quote;
        asset = underlyingSymbol.toString();
    }
    if (quote == 1) {
        type = "P";
        strike = +base;
        asset = strikeSymbol.toString();
    }

    const date = new Date(expiry * 1000);
    let month = date.getMonth().toString();
    let day = date.getDay().toString();
    let year = date.getFullYear().toString();
    let formattedSymbol =
        asset +
        year +
        month +
        day +
        type +
        strike.toString().padStart(6, "0").padEnd(2, "0");
    return formattedSymbol;
};

/**
 * @dev Deploys an option contract clone through the Registry contract.
 * @notice Deploys a Uniswap V2 Pair and adds liquidity to it (if its testnet).
 * @param optionParametersObject An object with the option parameters that will be deployed.
 * @return Address of the deployed option clone.
 */
const deployOption = async (optionParametersObject) => {
    // Get the Registry admin.
    const [signer] = await ethers.getSigners();

    // Get the contract instances.
    const registry = await getInstance("Registry", signer);
    const optionFactory = await getInstance("OptionFactory", signer);
    const redeemFactory = await getInstance("RedeemFactory", signer);

    // Check to see if Registry is in a ready-to-deploy-clone state.
    await checkInitialization(registry, optionFactory, redeemFactory);
    await checkTemplates(optionFactory, redeemFactory);

    // Get the option parameters from the object.
    let underlyingToken = optionParametersObject.underlyingToken;
    let strikeToken = optionParametersObject.strikeToken;
    let base = optionParametersObject.base;
    let quote = optionParametersObject.quote;
    let expiry = optionParametersObject.expiry;

    // Check to see if the option exists by trying to get its address. Returns zero address if not deployed.
    let optionAddress = await registry.getOptionAddress(
        underlyingToken,
        strikeToken,
        base,
        quote,
        expiry
    );

    // Deploy the option if it is the zero address.
    let deployCloneTx;
    if (optionAddress == ZERO_ADDRESS) {
        try {
            deployCloneTx = await registry.deployOption(
                underlyingToken,
                strikeToken,
                base,
                quote,
                expiry,
                { gasLimit: 1000000 }
            );
        } catch (err) {
            console.log(err);
        }
        // get deployed option address
        optionAddress = await registry.getOptionAddress(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        console.log("Deployed:", optionAddress, "in the tx:", deployCloneTx);
    }

    return optionAddress;
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
            console.log(err);
        }
        pairAddress = await uniswapFactory.getPair(optionAddress, tokenAddress);
    }
    return pairAddress;
};

/**
 * @dev Adds liquidity to a uniswap V2 pair of the option token and a token.
 * @param optionAddress The address of the option contract.
 * @param tokenAddress The address of the paired token.
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
    await checkAllowance(account, uniswapRouter, usdcToken);
    await checkAllowance(account, uniswapRouter, ethToken);
    // Approve the trader.
    await checkAllowance(account, trader, usdcToken);
    await checkAllowance(account, trader, ethToken);

    // Create a new pair if it does not exist (equal to address zero).
    let pairAddress = await getUniswapV2Pair(optionAddress, usdcToken.address);

    // approve the router to take the option liquidity
    let optionTokenInstance = new ethers.Contract(
        optionAddress,
        ERC20.abi,
        signer
    );
    await checkAllowance(account, uniswapRouter, optionTokenInstance);

    // Mint new options to add liquidity to uniswap pool.
    try {
        await trader.safeMint(optionAddress, parseEther("100"), account);
    } catch (err) {
        console.log(err);
    }

    // Add liquidity to Uniswap pool.
    try {
        await uniswapRouter.addLiquidity(
            optionAddress, // token 0
            usdcToken.address, // token 1
            parseEther("100"), // quantity of token 0
            parseEther("500"), // quantity of token 1
            0, // min quantity of lp tokens
            0, // min quantity of lp tokens
            account, // lp token receiver
            await uniswapTrader.getMaxDeadline() // deadline until trade expires
        );
    } catch (err) {
        console.log(err);
    }
    return pairAddress;
};

async function main() {
    // option = [underlying, strike, base, quote, expiry]
    let ETH_CALL_340 = [ETH.address, USDC.address, "1", "340", "1609286400"];
    let ETH_CALL_400 = [ETH.address, USDC.address, "1", "400", "1609286400"];
    let ETH_CALL_440 = [ETH.address, USDC.address, "1", "440", "1609286400"];
    let ETH_PUT_340 = [USDC.address, ETH.address, "340", "1", "1609286400"];
    let ETH_PUT_400 = [USDC.address, ETH.address, "400", "1", "1609286400"];
    let ETH_PUT_440 = [USDC.address, ETH.address, "440", "1", "1609286400"];
    let optionsArray = [
        ETH_CALL_340,
        ETH_CALL_400,
        ETH_CALL_440,
        ETH_PUT_340,
        ETH_PUT_400,
        ETH_PUT_440,
    ];

    let optionJsonObject = {};
    let optionAddressArray = [];
    for (let i = 0; i < optionsArray.length; i++) {
        let option = optionsArray[i];
        let underlyingToken = option[0];
        let strikeToken = option[1];
        let base = option[2];
        let quote = option[3];
        let expiry = option[4];
        let optionParametersObject = getOptionParametersObject(
            underlyingToken,
            strikeToken,
            base,
            quote,
            expiry
        );
        let optionAddress = await deployOption(optionParametersObject);
        optionAddressArray.push(optionAddress);
        let symbol = await getOptionSymbol(optionParametersObject);
        Object.assign(optionJsonObject, {
            [symbol]: {
                optionParameters: option,
                address: optionAddress,
            },
        });
    }

    writeOptionJson(optionJsonObject);
    console.log(optionAddressArray);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
