// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require('hardhat')
const { parseEther } = require('ethers/lib/utils')

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { log, deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const chain = await bre.getChainId()
  const ethToken = await deploy('TestERC20', {
    from: deployer,
    contractName: 'TestERC20',
    args: ['ETH', 'Ether', parseEther('100000000')],
  })

  const wethToken = await deploy('WETH9', {
    from: deployer,
    contractName: 'WETH9',
    args: [],
  })

  const usdcToken = await deploy('USDC', {
    from: deployer,
    contractName: 'USDC',
    args: ['USDC', 'Stablecoin', parseEther('10000000')],
  })

  const daiToken = await deploy('DAI', {
    from: deployer,
    contractName: 'DAI',
    args: ['DAI', 'DAI Stablecoin', parseEther('100000000')],
  })

  let deployed = [ethToken, usdcToken, wethToken, daiToken]
  for (let i = 0; i < deployed.length; i++) {
    if (deployed[i].newlyDeployed)
      log(`Contract deployed at ${deployed[i].address} using ${deployed[i].receipt.gasUsed} gas on chain ${chain}`)
  }
}
module.exports.tags = ['Test']
