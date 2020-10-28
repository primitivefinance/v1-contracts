const { parseEther, formatEther } = require("ethers/lib/utils");
const { checkInitialization } = require("../test/lib/utils");
const USDC = require("../deployments/rinkeby/USDC");
const { ADDRESSES } = require("../test/lib/constants");
const { ZERO_ADDRESS } = ADDRESSES;
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
    fs.writeFileSync("./options_deployments.json", data);
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
    }

    return optionAddress;
};

async function main() {
    // Get the signer and tokens.
    const [signer] = await ethers.getSigners();
    let ether = await getInstance("ETH", signer);
    let stablecoin = await getInstance("USDC", signer);
    // option = [underlying, strike, base, quote, expiry]
    let ETH_CALL_340 = [
        ether.address,
        stablecoin.address,
        "1",
        "340",
        "1609286400",
    ];
    let ETH_CALL_400 = [
        ether.address,
        stablecoin.address,
        "1",
        "400",
        "1609286400",
    ];
    let ETH_CALL_440 = [
        ether.address,
        stablecoin.address,
        "1",
        "440",
        "1609286400",
    ];
    let ETH_PUT_340 = [
        stablecoin.address,
        ether.address,
        "340",
        "1",
        "1609286400",
    ];
    let ETH_PUT_400 = [
        stablecoin.address,
        ether.address,
        "400",
        "1",
        "1609286400",
    ];
    let ETH_PUT_440 = [
        stablecoin.address,
        ether.address,
        "440",
        "1",
        "1609286400",
    ];
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
    // For each option object, parse its parameters, deploy it, and save it to options.json.
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
