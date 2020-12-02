// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require('hardhat')
const Weth = require('canonical-weth')

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { log, deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const chain = await bre.getChainId()
  let wethAddress
  if (chain == 31337) {
    const weth = await deploy('WETH9', {
      from: deployer,
      contractName: 'WETH9',
      args: [],
    })
    wethAddress = weth.address
  } else {
    wethAddress = Weth.networks[chain.toString()].address
  }
  const trader = await deploy('Trader', {
    from: deployer,
    contractName: 'Trader',
    args: [wethAddress],
  })
  let deployed = [trader]
  for (let i = 0; i < deployed.length; i++) {
    if (deployed[i].newlyDeployed)
      log(`Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`)
  }
}

module.exports.tags = ['Periphery']
