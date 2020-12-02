// Testing suite tools
const { expect } = require('chai')
const chai = require('chai')
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

// Convert to wei
const { parseEther } = require('ethers/lib/utils')

// Helper functions and constants
const setup = require('./lib/setup')
const constants = require('./lib/constants')
const { ONE_ETHER, MILLION_ETHER } = constants.VALUES
const { ERR_ZERO } = constants.ERR_CODES

describe('Option contract primitiveFlash fallback function', () => {
  // Accounts
  let Admin, User, Alice

  // Tokens
  let weth, dai, optionToken

  // Option Parameters
  let underlyingToken, strikeToken, base, quote, expiry

  // Periphery and Administrative contracts
  let registry, flash

  before(async () => {
    let signers = await setup.newWallets()

    // Signers
    Admin = signers[0]
    User = signers[1]

    // Addresses of Signers
    Alice = Admin.address
    Bob = User.address

    // Underlying and quote token instances
    weth = await setup.newWeth(Admin)
    dai = await setup.newERC20(Admin, 'TEST DAI', 'DAI', MILLION_ETHER)

    // Administrative contract instances
    registry = await setup.newRegistry(Admin)

    // Option Parameters
    underlyingToken = dai
    strikeToken = weth
    base = parseEther('200').toString()
    quote = parseEther('1').toString()
    expiry = '1690868800'

    // Option and Redeem token instances for parameters
    Primitive = await setup.newPrimitive(Admin, registry, underlyingToken, strikeToken, base, quote, expiry)

    optionToken = Primitive.optionToken
    redeemToken = Primitive.redeemToken
    flash = await setup.newFlash(Admin, optionToken.address)
  })

  describe('primitiveFlash', () => {
    it('execute a flash loan and return them', async () => {
      // Mint some options so the underlyingCache is > 0
      await underlyingToken.transfer(optionToken.address, ONE_ETHER)
      await optionToken.mintOptions(Alice)

      // Perform a good flash loan by returning the underlying tokens that are flash loaned
      await expect(flash.goodFlashLoan(ONE_ETHER)).to.emit(flash, 'FlashExercise').withArgs(flash.address)
    })
    it('should revert because the flash loan doesnt return the capital', async () => {
      // Mint some options so the underlyingCache balance is > 0
      await underlyingToken.transfer(optionToken.address, ONE_ETHER)
      await optionToken.mintOptions(Alice)

      // Perform a bad flash loan by nto returning the underlying tokens that are flash loaned
      await expect(flash.badFlashLoan(ONE_ETHER)).to.be.revertedWith(ERR_ZERO)
    })
  })
})
