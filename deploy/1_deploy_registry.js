// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const hre = require('hardhat')
const { ethers } = hre

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { log, deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const chain = await hre.getChainId()
  const signer = ethers.provider.getSigner(deployer)

  // Deploy the libraries, factories, and Registry.
  const optionTemplateLib = await deploy('OptionTemplateLib', {
    from: deployer,
    contractName: 'OptionTemplateLib',
    args: [],
  })
  const redeemTemplateLib = await deploy('RedeemTemplateLib', {
    from: deployer,
    contractName: 'RedeemTemplateLib',
    args: [],
  })

  const registry = await deploy('Registry', {
    from: deployer,
    contractName: 'Registry',
    args: [],
  })

  let optionFactory = await deploy('OptionFactory', {
    from: deployer,
    contractName: 'OptionFactory',
    args: [registry.address],
    libraries: {
      ['OptionTemplateLib']: optionTemplateLib.address,
    },
  })

  let redeemFactory = await deploy('RedeemFactory', {
    from: deployer,
    contractName: 'RedeemFactory',
    args: [registry.address],
    libraries: {
      ['RedeemTemplateLib']: redeemTemplateLib.address,
    },
  })

  // Get the instances for the option and redeem factories, and Registry so we can initialize them.
  const opFacInstance = new ethers.Contract(optionFactory.address, optionFactory.abi, signer)
  const reFacInstance = new ethers.Contract(redeemFactory.address, redeemFactory.abi, signer)
  const registryInstance = new ethers.Contract(registry.address, registry.abi, signer)

  // Set the option and redeem factory addresses in the Registry
  if (optionFactory.address == ethers.constants.AddressZero) {
    await registryInstance.setOptionFactory(optionFactory.address)
  }
  if (redeemFactory.address == ethers.constants.AddressZero) {
    await registryInstance.setRedeemFactory(redeemFactory.address)
  }

  // If the option and redeem template addresses are the zero address,
  // deploy them (which sets them to non-zero).
  const optionImpAddress = await opFacInstance.optionTemplate()
  const redeemImpAddress = await reFacInstance.redeemTemplate()
  if (optionImpAddress == ethers.constants.AddressZero) {
    await opFacInstance.deployOptionTemplate()
  }
  if (redeemImpAddress == ethers.constants.AddressZero) {
    await reFacInstance.deployRedeemTemplate()
  }

  // Log the contract address deployments.
  let deployed = [registry, optionFactory, redeemFactory]
  for (let i = 0; i < deployed.length; i++) {
    if (deployed[i].newlyDeployed)
      log(`Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`)
  }
}

module.exports.tags = ['Core']
