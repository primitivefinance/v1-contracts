const { parseEther, formatEther } = require('ethers/lib/utils')
const { checkInitialization } = require('../test/lib/utils')
const { ADDRESSES } = require('../test/lib/constants')
const { ZERO_ADDRESS } = ADDRESSES
const fs = require('fs')
const UniswapV2Factory = require('@uniswap/v2-core/build/IUniswapV2Factory.json')
const OptionABI = require('../artifacts/contracts/option/primitives/Option.sol/Option.json')
const optionsToDeployPairsFor = require('./json/option_mainnet_deployments_1610322182052.json')

/**
 * @dev Checks the optionTemplate and redeemTemplate. If they are address zero, it will call deployTemplate().
 * @param {*} optionFactory The OptionFactory contract instance.
 * @param {*} redeemFactory The RedeemFactory contract instance.
 */
const checkTemplates = async (optionFactory, redeemFactory) => {
  const optionTemplate = await optionFactory.optionTemplate()
  const redeemTemplate = await redeemFactory.redeemTemplate()
  if (optionTemplate.toString() == ethers.constants.AddressZero.toString()) {
    await optionFactory.deployOptionTemplate()
  }
  if (redeemTemplate.toString() == ethers.constants.AddressZero.toString()) {
    await redeemFactory.deployRedeemTemplate()
  }
  return { optionTemplate, redeemTemplate }
}

const writeOptionJson = (optionJsonObject, path) => {
  let data = JSON.stringify(optionJsonObject, null, 2)
  fs.writeFileSync(path, data)
}

/**
 * @dev Gets the contract instance of a contract using its name.
 * @param {*} contractName The contract name `contract NAME {}`.
 * @param {*} signer The ethers js Signer object to call the transaction.
 * @return Contract instance.
 */
const getInstance = async (contractName, signer) => {
  const contract = await deployments.get(contractName)
  const instance = new ethers.Contract(contract.address, contract.abi, signer)
  return instance
}

/**
 * @dev Function to validate argument data and create the correct data object.
 * @return optionParametersObject Returns an optionParametersObject.
 */
const getOptionParametersObject = (underlyingToken, strikeToken, base, quote, expiry) => {
  const optionParametersObject = {
    underlyingToken: underlyingToken,
    strikeToken: strikeToken,
    base: parseEther(base),
    quote: parseEther(quote),
    expiry: expiry,
  }
  return optionParametersObject
}

/**
 * @dev Concatenates a string of the option's symbol in the format:
 *      ASSET + YY + MM + DD + TYPE + STRIKE
 * @param {*} optionParametersObject The object with the option's parameters.
 * @returns An option's symbol according to its parameters.
 */
const getOptionSymbol = (underlyingSymbol, optionParametersObject) => {
  let base = formatEther(optionParametersObject.base)
  let quote = formatEther(optionParametersObject.quote)
  let expiry = optionParametersObject.expiry
  let asset = underlyingSymbol.toString().toUpperCase()
  let type
  let strike
  if (base == 1) {
    type = 'C'
    strike = +quote
  }
  if (quote == 1) {
    type = 'P'
    strike = +base
  }

  const date = new Date(expiry * 1000)
  let month = (date.getUTCMonth() + 1).toString()
  let day = date.getUTCDate().toString()
  let year = date.getUTCFullYear().toString()
  let formattedSymbol = asset + year + month + day + type + strike.toString().padStart(6, '0').padEnd(2, '0')
  return formattedSymbol
}

/**
 * @dev Deploys an option contract clone through the Registry contract.
 * @notice Deploys a Uniswap V2 Pair and adds liquidity to it (if its testnet).
 * @param optionParametersObject An object with the option parameters that will be deployed.
 * @return Address of the deployed option clone.
 */
const deployPair = async (optionAddress) => {
  // Get the Registry admin.
  const { deployer } = await getNamedAccounts()
  const signer = ethers.provider.getSigner(deployer)
  const uniswapFactory = new ethers.Contract('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', UniswapV2Factory.abi, signer)
  const option = new ethers.Contract(optionAddress, OptionABI.abi, signer)

  // Get the option parameters from the object.
  let underlyingToken = await option.getUnderlyingTokenAddress()
  let redeemToken = await option.redeemToken()

  // Check to see if the option exists by trying to get its address. Returns zero address if not deployed.
  let pairAddress = await uniswapFactory.getPair(redeemToken, underlyingToken)

  // Deploy the option if it is the zero address.
  let deployCloneTx
  if (pairAddress == ZERO_ADDRESS) {
    try {
      deployCloneTx = await uniswapFactory.createPair(redeemToken, underlyingToken)
      console.log(`testing complete, deploying for: ${underlyingToken} ${redeemToken}`)
    } catch (err) {
      console.log(err)
    }
    // get deployed option address
    pairAddress = await uniswapFactory.getPair(redeemToken, underlyingToken)
  }

  return pairAddress
}

const ADDRESS_FOR_MARKET = {
  eth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  yfi: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
  /* 
  sushi: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
  comp: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
  uni: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  link: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  aave: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  snx: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
  mkr: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', */
}

async function main() {
  // allOptions = { [eth]: [ [address0, address1, base, quote, expiry], ] }
  let allOptions = {}

  // Each of the assets
  let keys = Object.keys(ADDRESS_FOR_MARKET)

  // for each asset create an array of calls and puts
  for (let k = 0; k < keys.length; k++) {
    let asset = keys[k]
    let options = Object.keys(optionsToDeployPairsFor[asset])
    let array = []

    // options
    for (let o = 0; o < options.length; o++) {
      console.log(optionsToDeployPairsFor[asset], options[o])
      let optionSymbol = options[o]
      let option = optionsToDeployPairsFor[asset][optionSymbol]
      // [address0, address1, base, quote, expiry]
      let address = option.address
      array.push(address)
    }

    // allOptions[eth] = [ [optionParams], ..., ]
    allOptions[asset] = array
  }

  // For each option object, parse its parameters, deploy it, and save it to a json file.
  for (let i = 0; i < Object.keys(allOptions).length; i++) {
    // Asset: e.g. 'eth'
    let asset = Object.keys(allOptions)[i]

    // allOptions[eth]
    let assetOptions = allOptions[asset]

    // For each of the options of the asset, deploy it using the parameters
    for (let x = 0; x < assetOptions.length; x++) {
      let optionAddress = assetOptions[x]

      // Deploy the option
      let pairAddress = await deployPair(optionAddress)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
