const { ethers } = require('hardhat')

// Artifacts
const TestERC20 = require('../../artifacts/contracts/test/tokens/TestERC20.sol/TestERC20.json')
const BadERC20 = require('../../artifacts/contracts/test/tokens/BadERC20.sol/BadERC20.json')
const Registry = require('../../artifacts/contracts/option/applications/Registry.sol/Registry.json')
const OptionFactory = require('../../artifacts/contracts/option/applications/factories/OptionFactory.sol/OptionFactory.json')
const RedeemFactory = require('../../artifacts/contracts/option/applications/factories/RedeemFactory.sol/RedeemFactory.json')
const Option = require('../../artifacts/contracts/option/primitives/Option.sol/Option.json')
const Redeem = require('../../artifacts/contracts/option/primitives/Redeem.sol/Redeem.json')
const OptionTest = require('../../artifacts/contracts/test/OptionTest.sol/OptionTest.json')
const Flash = require('../../artifacts/contracts/test/Flash.sol/Flash.json')
const Weth = require('../../artifacts/contracts/test/tokens/WETH9.sol/WETH9.json')
const Trader = require('../../artifacts/contracts/option/extensions/Trader.sol/Trader.json')
const OptionTemplateLib = require('../../artifacts/contracts/option/libraries/OptionTemplateLib.sol/OptionTemplateLib.json')
const RedeemTemplateLib = require('../../artifacts/contracts/option/libraries/RedeemTemplateLib.sol/RedeemTemplateLib.json')

// Constants and Utility functions
const constants = require('./constants')
const { MILLION_ETHER } = constants.VALUES
const { OPTION_TEMPLATE_LIB, REDEEM_TEMPLATE_LIB } = constants.LIBRARIES
const { deployContract, link } = require('ethereum-waffle')

// Uniswap related artifacts and addresses
const UniswapV2Router02 = require('@uniswap/v2-periphery/build/UniswapV2Router02.json')
const UniswapV2Factory = require('@uniswap/v2-core/build/UniswapV2Factory.json')
const { RINKEBY_UNI_ROUTER02, RINKEBY_UNI_FACTORY } = constants.ADDRESSES

const overrides = {
  gasLimit: 10000000
}

/**
 * @dev Gets signers from ethers.
 */
const newWallets = async () => {
  const wallets = await ethers.getSigners()
  return wallets
}

/**
 * @dev Deploys a new ERC-20 token contract.
 * @param {*} signer An ethers js Signer object
 * @param {*} name The name for the ERC-20 token.
 * @param {*} symbol The symbol for the ERC-20 token.
 * @param {*} totalSupply The initial supply for the token.
 */
const newERC20 = async (signer, name, symbol, totalSupply) => {
  const ERC20 = await deployContract(signer, TestERC20, [name, symbol, totalSupply], overrides)
  return ERC20
}

/**
 * @dev Deploys a non-standard ERC-20 token that does not return a boolean.
 * @param {*} signer An ethers js Signer object.
 * @param {*} name The name for the ERC-20 token.
 * @param {*} symbol The symbol for the ERC-20 token.
 */
const newBadERC20 = async (signer, name, symbol) => {
  const bad = await deployContract(signer, BadERC20, [name, symbol], overrides)
  return bad
}

/**
 * @dev Deploys a new WETH contract using the canonical-weth package.
 * @param {*} signer An ethers js Signer object.
 */
const newWeth = async (signer) => {
  const weth = await deployContract(signer, Weth, [], overrides)
  return weth
}

/**
 * @dev Deploys a test contract Flash.sol.
 * @param {*} signer
 * @param {*} optionToken The address of an Option contract
 */
const newFlash = async (signer, optionToken) => {
  const flash = await deployContract(signer, Flash, [optionToken], overrides)
  return flash
}

/**
 * @dev Deploys a Registry instance and initializes it with the correct factories.
 * @param signer A Signer object from ethers js.
 */
const newRegistry = async (signer) => {
  const registry = await deployContract(signer, Registry, [], overrides)
  let oLib = await deployContract(signer, OptionTemplateLib, [], overrides)
  let opFacContract = Object.assign(OptionFactory, {
    evm: { bytecode: { object: OptionFactory.bytecode } },
  })
  link(opFacContract, OPTION_TEMPLATE_LIB, oLib.address)

  let optionFactory = await deployContract(signer, opFacContract, [registry.address], overrides)
  let rLib = await deployContract(signer, RedeemTemplateLib, [], overrides)

  let reFacContract = Object.assign(RedeemFactory, {
    evm: { bytecode: { object: RedeemFactory.bytecode } },
  })
  link(reFacContract, REDEEM_TEMPLATE_LIB, rLib.address)

  let redeemTokenFactory = await deployContract(signer, reFacContract, [registry.address], overrides)
  await optionFactory.deployOptionTemplate()
  await redeemTokenFactory.deployRedeemTemplate()
  await registry.setOptionFactory(optionFactory.address)
  await registry.setRedeemFactory(redeemTokenFactory.address)
  return registry
}

/**
 * @dev Deploys new option and redeem factory instances and links the necessary libraries.
 * @param {*} signer
 * @param {*} registry The registry contract instance.
 */
const newOptionFactory = async (signer, registry) => {
  let oLib = await deployContract(signer, OptionTemplateLib, [], overrides)
  let opFacContract = Object.assign(OptionFactory, {
    evm: { bytecode: { object: OptionFactory.bytecode } },
  })
  link(opFacContract, OPTION_TEMPLATE_LIB, oLib.address)

  let optionFactory = await deployContract(signer, opFacContract, [registry.address], overrides)
  let rLib = await deployContract(signer, RedeemTemplateLib, [], overrides)

  let reFacContract = Object.assign(RedeemFactory, {
    evm: { bytecode: { object: RedeemFactory.bytecode } },
  })
  link(reFacContract, REDEEM_TEMPLATE_LIB, rLib.address)

  let redeemTokenFactory = await deployContract(signer, reFacContract, [registry.address], overrides)
  await optionFactory.deployOptionTemplate()
  await redeemTokenFactory.deployRedeemTemplate()
  await registry.setOptionFactory(optionFactory.address)
  await registry.setRedeemFactory(redeemTokenFactory.address)
  return optionFactory
}

/**
 * @dev Deploys a TestOption contract instance and returns it.
 * @param {*} signer
 * @param {*} underlyingToken The address of the underlying token.
 * @param {*} strikeToken The address of the strike token.
 * @param {*} base The quantity of underlying tokens per unit of quote strike tokens.
 * @param {*} quote The quantity of strike tokens per unit of base underlying tokens.
 * @param {*} expiry The unix timestamp for when the option token expires.
 */
const newTestOption = async (signer, underlyingToken, strikeToken, base, quote, expiry) => {
  const optionToken = await deployContract(signer, OptionTest, [], overrides)
  await optionToken.initialize(underlyingToken, strikeToken, base, quote, expiry)
  return optionToken
}

/**
 *
 * @param {*} signer
 * @param {*} factory The address of the redeem factory contract.
 * @param {*} optionToken The address of the option token linked to the redeem token.
 * @param {*} underlying The address of the underlying token for the option token.
 */
const newTestRedeem = async (signer, factory, optionToken) => {
  const redeemToken = await deployContract(signer, Redeem, [], overrides)
  await redeemToken.initialize(factory, optionToken)
  return redeemToken
}

/**
 * @dev Deploys a new Trader contract instance.
 * @param {*} signer
 * @param {*} weth The address of WETH for the respective network.
 */
const newTrader = async (signer, weth) => {
  const trader = await deployContract(signer, Trader, [weth], overrides)
  return trader
}

/**
 * @dev Deploys a new Option contract instance through the Registry contract instance.
 * @param {*} signer
 * @param {*} registry The instance of the Registry contract.
 * @param {*} underlyingToken The address of the underlying token.
 * @param {*} strikeToken The address of the strike token.
 * @param {*} base The quantity of underlying tokens per unit of quote strike tokens.
 * @param {*} quote The quantity of strike tokens per unit of base underlying tokens.
 * @param {*} expiry The unix timestamp for when the option expires.
 */
const newOption = async (signer, registry, underlyingToken, strikeToken, base, quote, expiry) => {
  await registry.verifyToken(underlyingToken)
  await registry.verifyToken(strikeToken)
  await registry.deployOption(underlyingToken, strikeToken, base, quote, expiry)
  let optionToken = new ethers.Contract(
    await registry.allOptionClones(((await registry.getAllOptionClonesLength()) - 1).toString()),
    Option.abi,
    signer
  )
  return optionToken
}

/**
 * @dev Gets the Redeem token contract instance by getting the address through the option token.
 * @param {*} signer
 * @param {*} optionToken The instance of the option token contract.
 */
const newRedeem = async (signer, optionToken) => {
  let redeemTokenAddress = await optionToken.redeemToken()
  let redeemToken = new ethers.Contract(redeemTokenAddress, Redeem.abi, signer)
  return redeemToken
}

/**
 * @dev Deploys new Option and Redeem contract instances and returns them.
 * @param {*} signer
 * @param {*} registry The instance contract of the Registry.
 * @param {*} underlyingToken The instance contract for the underlying token.
 * @param {*} strikeToken The instance contract for the strike token.
 * @param {*} base The quantity of underlying tokens per unit of quote stike tokens.
 * @param {*} quote The quantity of strike tokens per unit of base underlying tokens.
 * @param {*} expiry The unix timestamp for when the option expires.
 */
const newPrimitive = async (signer, registry, underlyingToken, strikeToken, base, quote, expiry) => {
  let optionToken = await newOption(signer, registry, underlyingToken.address, strikeToken.address, base, quote, expiry)
  let redeemToken = await newRedeem(signer, optionToken)

  const Primitive = {
    underlyingToken: underlyingToken,
    strikeToken: strikeToken,
    optionToken: optionToken,
    redeemToken: redeemToken,
  }
  return Primitive
}

/**
 * @dev A generalized function to update approval state for any ERC-20 token.
 * @param {*} token The contract instance of the token that should update its approval.
 * @param {*} signer The address which is approving.
 * @param {*} spender The address which should be approved.
 */
const approveToken = async (token, signer, spender) => {
  await token.approve(spender, MILLION_ETHER, { from: signer })
}

/**
 * @dev Deploys a new Uniswap factory and router instance for testing.
 * @param {*} signer
 * @param {*} feeToSetter The address which receives fees from the uniswap contracts.
 * @param {*} WETH The address of WETH for the respective chain ID.
 */
const newUniswap = async (signer, feeToSetter, WETH) => {
  const uniswapFactory = await deployContract(signer, UniswapV2Factory, [feeToSetter], overrides)
  const uniswapRouter = await deployContract(signer, UniswapV2Router02, [uniswapFactory.address, WETH.address], overrides)
  return { uniswapRouter, uniswapFactory }
}

/**
 * @dev Gets the contract instances for Uniswap's Router and Factory for Rinkeby.
 */
const newUniswapRinkeby = async (signer) => {
  const uniswapRouter = new ethers.Contract(RINKEBY_UNI_ROUTER02, UniswapV2Router02.abi, signer)
  const uniswapFactory = new ethers.Contract(RINKEBY_UNI_FACTORY, UniswapV2Factory.abi, signer)
  return { uniswapRouter, uniswapFactory }
}

Object.assign(module.exports, {
  newUniswap,
  newUniswapRinkeby,
  newWallets,
  newERC20,
  newBadERC20,
  newWeth,
  newOption,
  newRedeem,
  newTestRedeem,
  newFlash,
  newTestOption,
  newRegistry,
  newOptionFactory,
  newPrimitive,
  approveToken,
  newTrader,
})
