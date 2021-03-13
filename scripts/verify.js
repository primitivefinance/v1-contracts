const hre = require('hardhat')
const { CONTRACT_NAMES, LIBRARIES } = require('../test/lib/constants')
const { REGISTRY, TRADER, OPTION_FACTORY, REDEEM_FACTORY, OPTION, REDEEM, UNISWAP_TRADER, DAI } = CONTRACT_NAMES
const { OPTION_TEMPLATE_LIB, REDEEM_TEMPLATE_LIB } = LIBRARIES
const { getContractAt } = hre.ethers

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

/**
 * @dev Generalized verification function using the verify task from the buidlers-etherscan plugin.
 * @param {*} fullName The full name of the contract in the format: /path/to/contract:contractName.
 * @param {*} address The address of the contract to verify.
 * @param {*} constructorArgs Any constructor arguments for the contract, in an array.
 * @param {*} library Library that the contract has linked.
 */
const verifyContract = async (fullName, address, constructorArgs, library) => {
  await run('verify', {
    address: address,
    contractName: fullName,
    libraries: JSON.stringify(library),
    constructorArguments: constructorArgs,
  })
}

/**
 * @dev Verifies the Registry.sol contract on etherscan.
 */
const verifyRegistry = async () => {
  let Registry = await deployments.get('Registry')
  try {
    await verifyContract(REGISTRY, Registry.address, Registry.args, {})
  } catch (err) {
    console.error(err)
  }
}

/**
 * @dev Verifies the TestERC20 tokens.
 */
const verifyDai = async () => {
  let Dai = await deployments.get('DAI')
  try {
    await verifyContract(DAI, Dai.address, Dai.args, {})
  } catch (err) {
    console.error(err)
  }
}

/**
 * @dev Verifies the Option and Redeem factories.
 */
const verifyFactories = async () => {
  let OptionFactory = await deployments.get('OptionFactory')
  console.log(await hre.getChainId(), OptionFactory.address)
  let OptionTemplateLib = await deployments.get('OptionTemplateLib')
  try {
    await verifyContract(OPTION_FACTORY, OptionFactory.address, OptionFactory.args, {
      [OPTION_TEMPLATE_LIB]: OptionTemplateLib.address,
    })
  } catch (err) {
    console.error(err)
  }

  let RedeemFactory = await deployments.get('RedeemFactory')
  let RedeemTemplateLib = await deployments.get('RedeemTemplateLib')

  try {
    await verifyContract(REDEEM_FACTORY, RedeemFactory.address, RedeemFactory.args, {
      [REDEEM_TEMPLATE_LIB]: RedeemTemplateLib.address,
    })
  } catch (err) {
    console.error(err)
  }
}

/**
 * @dev Verifies the Trader and UniswapTrader contracts.
 */
const verifyTrader = async () => {
  let Trader = await deployments.get('Trader')
  try {
    await verifyContract(TRADER, Trader.address, Trader.args, {})
  } catch (err) {
    console.error(err)
  }
}

/**
 * @dev Verifies the template addresses which will be cloned. These are the canonical
 *      Option and Redeem contracts effectively.
 */
const verifyTemplates = async () => {
  let OptionFactory = await deployments.get('OptionFactory')
  let RedeemFactory = await deployments.get('RedeemFactory')
  const optionFactory = await getContractAt(OptionFactory.abi, OptionFactory.address)
  const redeemFactory = await getContractAt(RedeemFactory.abi, RedeemFactory.address)
  // warning: deploys templates which costs gas.
  const { optionTemplate, redeemTemplate } = await checkTemplates(optionFactory, redeemFactory)
  try {
    await verifyContract(OPTION, optionTemplate, [], {})
  } catch (err) {
    console.error(err)
  }
  try {
    await verifyContract(REDEEM, redeemTemplate, [], {})
  } catch (err) {
    console.error(err)
  }
}

/**
 * @dev Calling this verify script with the --network tag will verify them on etherscan automatically.
 */
async function main() {
  await verifyFactories()
  await verifyRegistry()
  await verifyTrader()
  await verifyTemplates()
  //await verifyDai()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

Object.assign(module.exports, {
  checkTemplates,
})
