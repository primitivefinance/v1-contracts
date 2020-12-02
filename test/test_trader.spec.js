// Testing suite tools
const { assert, expect } = require('chai')
const chai = require('chai')
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

// Convert to wei
const { parseEther } = require('ethers/lib/utils')

// Helper functions and constants
const utils = require('./lib/utils')
const setup = require('./lib/setup')
const constants = require('./lib/constants')
const { assertBNEqual, verifyOptionInvariants, getTokenBalance } = utils

const { ONE_ETHER, FIVE_ETHER, TEN_ETHER, HUNDRED_ETHER, THOUSAND_ETHER, MILLION_ETHER } = constants.VALUES

const {
  ERR_BAL_UNDERLYING,
  ERR_ZERO,
  ERR_BAL_STRIKE,
  ERR_BAL_OPTIONS,
  ERR_BAL_REDEEM,
  ERR_NOT_EXPIRED,
} = constants.ERR_CODES

describe('Trader', () => {
  // Accounts
  let Admin, User, Alice, Bob

  // Tokens
  let weth, dai, optionToken, redeemToken

  // Option Parameters
  let underlyingToken, strikeToken, base, quote, expiry

  // Periphery and Administrative contracts
  let registry, trader

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

    // Trader contract instance
    trader = await setup.newTrader(Admin, weth.address)

    // Approve tokens for trader to use
    await underlyingToken.approve(trader.address, MILLION_ETHER)
    await strikeToken.approve(trader.address, MILLION_ETHER)
    await optionToken.approve(trader.address, MILLION_ETHER)
    await redeemToken.approve(trader.address, MILLION_ETHER)
  })

  describe('Constructor', () => {
    it('should return the correct weth address', async () => {
      expect(await trader.weth()).to.be.equal(weth.address)
    })
  })

  describe('safeMint', () => {
    safeMint = async (inputUnderlyings) => {
      // Calculate the strike price of each unit of underlying token
      let outputRedeems = inputUnderlyings.mul(quote).div(base)

      let underlyingBal = await getTokenBalance(underlyingToken, Alice)
      let optionBal = await getTokenBalance(optionToken, Alice)
      let redeemBal = await getTokenBalance(redeemToken, Alice)

      await expect(trader.safeMint(optionToken.address, inputUnderlyings, Alice))
        .to.emit(trader, 'TraderMint')
        .withArgs(Alice, optionToken.address, inputUnderlyings.toString(), outputRedeems.toString())

      let underlyingsChange = (await getTokenBalance(underlyingToken, Alice)).sub(underlyingBal)
      let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(optionBal)
      let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(redeemBal)

      assertBNEqual(underlyingsChange, inputUnderlyings.mul(-1))
      assertBNEqual(optionsChange, inputUnderlyings)
      assertBNEqual(redeemsChange, outputRedeems)

      await verifyOptionInvariants(underlyingToken, strikeToken, optionToken, redeemToken)
    }

    it('should revert if amount is 0', async () => {
      await expect(trader.safeMint(optionToken.address, 0, Alice)).to.be.revertedWith(ERR_ZERO)
    })

    it('should revert if optionToken.address is not an option ', async () => {
      await expect(trader.safeMint(Alice, 10, Alice)).to.be.reverted
    })

    it('should revert if msg.sender does not have enough underlyingToken for tx', async () => {
      await expect(trader.connect(User).safeMint(optionToken.address, MILLION_ETHER, Alice)).to.be.revertedWith(
        ERR_BAL_UNDERLYING
      )
    })

    it('should emit the mint event', async () => {
      let inputUnderlyings = ONE_ETHER
      let outputRedeems = inputUnderlyings.mul(quote).div(base)
      await expect(trader.safeMint(optionToken.address, inputUnderlyings, Alice))
        .to.emit(trader, 'TraderMint')
        .withArgs(Alice, optionToken.address, inputUnderlyings.toString(), outputRedeems.toString())
    })

    it('should mint optionTokens and redeemTokens in correct amounts', async () => {
      await safeMint(ONE_ETHER)
    })

    it('should successfully call safe mint a few times in a row', async () => {
      await safeMint(ONE_ETHER)
      await safeMint(TEN_ETHER)
      await safeMint(FIVE_ETHER)
      await safeMint(parseEther('0.5123542351'))
      await safeMint(parseEther('1.23526231124324'))
      await safeMint(parseEther('2.234345'))
    })
  })

  describe('safeExercise', () => {
    beforeEach(async () => {
      await safeMint(TEN_ETHER)
    })

    safeExercise = async (inputUnderlyings) => {
      // Options:Underlyings are always at a 1:1 ratio.
      let inputOptions = inputUnderlyings
      // Calculate the amount of strike tokens necessary to exercise
      let inputStrikes = inputUnderlyings.mul(quote).div(base)

      let underlyingBal = await getTokenBalance(underlyingToken, Alice)
      let optionBal = await getTokenBalance(optionToken, Alice)
      let strikeBal = await getTokenBalance(strikeToken, Alice)

      await expect(trader.safeExercise(optionToken.address, inputUnderlyings, Alice))
        .to.emit(trader, 'TraderExercise')
        .withArgs(Alice, optionToken.address, inputUnderlyings.toString(), inputStrikes.toString())

      let underlyingsChange = (await getTokenBalance(underlyingToken, Alice)).sub(underlyingBal)
      let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(optionBal)
      let strikesChange = (await getTokenBalance(strikeToken, Alice)).sub(strikeBal)

      assertBNEqual(underlyingsChange, inputUnderlyings)
      assertBNEqual(optionsChange, inputOptions.mul(-1))
      assertBNEqual(strikesChange, inputStrikes.mul(-1))

      await verifyOptionInvariants(underlyingToken, strikeToken, optionToken, redeemToken)
    }

    it('should revert if amount is 0', async () => {
      await expect(trader.safeExercise(optionToken.address, 0, Alice)).to.be.revertedWith(ERR_ZERO)
    })

    it('should revert if user does not have enough optionToken tokens', async () => {
      await expect(trader.safeExercise(optionToken.address, MILLION_ETHER, Alice)).to.be.revertedWith(ERR_BAL_OPTIONS)
    })

    it('should revert if user does not have enough strike tokens', async () => {
      await trader.safeMint(optionToken.address, ONE_ETHER, Bob)
      await strikeToken.connect(User).transfer(Alice, await strikeToken.balanceOf(Bob))
      await expect(trader.connect(User).safeExercise(optionToken.address, ONE_ETHER, Bob)).to.be.revertedWith(ERR_BAL_STRIKE)
    })

    it('should exercise consecutively', async () => {
      await strikeToken.deposit({
        from: Alice,
        value: TEN_ETHER,
      })
      await safeExercise(parseEther('0.1'))
      await safeExercise(parseEther('0.32525'))
      await safeExercise(ONE_ETHER)
    })
  })

  describe('safeRedeem', () => {
    beforeEach(async () => {
      await safeMint(parseEther('200'))
    })

    safeRedeem = async (inputRedeems) => {
      let outputStrikes = inputRedeems

      let redeemBal = await getTokenBalance(redeemToken, Alice)
      let strikeBal = await getTokenBalance(strikeToken, Alice)

      await expect(trader.safeRedeem(optionToken.address, inputRedeems, Alice))
        .to.emit(trader, 'TraderRedeem')
        .withArgs(Alice, optionToken.address, inputRedeems.toString())

      let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(redeemBal)
      let strikesChange = (await getTokenBalance(strikeToken, Alice)).sub(strikeBal)

      assertBNEqual(redeemsChange, inputRedeems.mul(-1))
      assertBNEqual(strikesChange, outputStrikes)

      await verifyOptionInvariants(underlyingToken, strikeToken, optionToken, redeemToken)
    }

    it('should revert if amount is 0', async () => {
      await expect(trader.safeRedeem(optionToken.address, 0, Alice)).to.be.revertedWith(ERR_ZERO)
    })

    it('should revert if user does not have enough redeemToken tokens', async () => {
      await expect(trader.safeRedeem(optionToken.address, MILLION_ETHER, Alice)).to.be.revertedWith(ERR_BAL_REDEEM)
    })

    it('should revert if  contract does not have enough strike tokens', async () => {
      await expect(trader.safeRedeem(optionToken.address, ONE_ETHER, Alice)).to.be.revertedWith(ERR_BAL_STRIKE)
    })

    it('should redeemToken consecutively', async () => {
      await safeExercise(parseEther('200'))
      await safeRedeem(parseEther('0.1'))
      await safeRedeem(parseEther('0.32525'))
      await safeRedeem(parseEther('0.5'))
    })
  })

  describe('safeClose', () => {
    beforeEach(async () => {
      await safeMint(parseEther('1'))
    })

    safeClose = async (inputOptions) => {
      let inputRedeems = inputOptions.mul(quote).div(base)

      let underlyingBal = await getTokenBalance(underlyingToken, Alice)
      let optionBal = await getTokenBalance(optionToken, Alice)
      let redeemBal = await getTokenBalance(redeemToken, Alice)

      await expect(trader.safeClose(optionToken.address, inputOptions, Alice))
        .to.emit(trader, 'TraderClose')
        .withArgs(Alice, optionToken.address, inputOptions.toString())

      let underlyingsChange = (await getTokenBalance(underlyingToken, Alice)).sub(underlyingBal)
      let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(optionBal)
      let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(redeemBal)

      assertBNEqual(underlyingsChange, inputOptions)
      assertBNEqual(optionsChange, inputOptions.mul(-1))
      assertBNEqual(redeemsChange, inputRedeems.mul(-1))

      await verifyOptionInvariants(underlyingToken, strikeToken, optionToken, redeemToken)
    }

    it('should revert if amount is 0', async () => {
      await expect(trader.safeClose(optionToken.address, 0, Alice)).to.be.revertedWith(ERR_ZERO)
    })

    it('should revert if user does not have enough redeemToken tokens', async () => {
      await trader.safeMint(optionToken.address, ONE_ETHER, Bob)
      await redeemToken.connect(User).transfer(Alice, await redeemToken.balanceOf(Bob))
      await expect(trader.connect(User).safeClose(optionToken.address, ONE_ETHER, Bob)).to.be.revertedWith(ERR_BAL_REDEEM)
    })

    it('should revert if user does not have enough optionToken tokens', async () => {
      await trader.safeMint(optionToken.address, ONE_ETHER, Bob)
      await optionToken.connect(User).transfer(Alice, await optionToken.balanceOf(Bob))
      await expect(trader.connect(User).safeClose(optionToken.address, ONE_ETHER, Bob)).to.be.revertedWith(ERR_BAL_OPTIONS)
    })

    it('should revert if calling unwind and not expired', async () => {
      await expect(trader.safeUnwind(optionToken.address, ONE_ETHER, Alice)).to.be.revertedWith(ERR_NOT_EXPIRED)
    })

    it('should close consecutively', async () => {
      await safeMint(TEN_ETHER)
      await safeClose(ONE_ETHER)
      await safeClose(FIVE_ETHER)
      await safeClose(parseEther('2.5433451'))
    })
  })

  describe('full test', () => {
    beforeEach(async () => {
      // Deploy a new trader instance
      trader = await setup.newTrader(Admin, weth.address)
      // Approve the tokens that are being used
      await underlyingToken.approve(trader.address, MILLION_ETHER)
      await strikeToken.approve(trader.address, MILLION_ETHER)
      await optionToken.approve(trader.address, MILLION_ETHER)
      await redeemToken.approve(trader.address, MILLION_ETHER)
    })

    it('should handle multiple transactions', async () => {
      // Start with 1000 options
      await underlyingToken.mint(Alice, THOUSAND_ETHER)
      await safeMint(THOUSAND_ETHER)

      await safeClose(ONE_ETHER)
      await safeExercise(parseEther('200'))
      await safeRedeem(parseEther('0.1'))
      await safeClose(ONE_ETHER)
      await safeExercise(ONE_ETHER)
      await safeExercise(ONE_ETHER)
      await safeExercise(ONE_ETHER)
      await safeExercise(ONE_ETHER)
      await safeRedeem(parseEther('0.23'))
      await safeRedeem(parseEther('0.1234'))
      await safeRedeem(parseEther('0.15'))
      await safeRedeem(parseEther('0.2543'))
      await safeClose(FIVE_ETHER)
      await safeClose(await optionToken.balanceOf(Alice))
      await safeRedeem(await redeemToken.balanceOf(Alice))

      // Assert option and redeem token balances are 0
      let optionBal = await optionToken.balanceOf(Alice)
      let redeemBal = await redeemToken.balanceOf(Alice)

      assertBNEqual(optionBal, 0)
      assertBNEqual(redeemBal, 0)
    })
  })

  describe('safeUnwind', () => {
    beforeEach(async () => {
      // Sets up contract instances
      trader = await setup.newTrader(Admin, weth.address)
      optionToken = await setup.newTestOption(Admin, underlyingToken.address, strikeToken.address, base, quote, expiry)
      redeemToken = await setup.newTestRedeem(Admin, Alice, optionToken.address)

      await optionToken.setRedeemToken(redeemToken.address)

      // Approve tokens for two signer accounts
      await underlyingToken.approve(trader.address, MILLION_ETHER)
      await strikeToken.approve(trader.address, MILLION_ETHER)
      await optionToken.approve(trader.address, MILLION_ETHER)
      await redeemToken.approve(trader.address, MILLION_ETHER)

      await underlyingToken.connect(User).approve(trader.address, MILLION_ETHER)
      await strikeToken.connect(User).approve(trader.address, MILLION_ETHER)
      await optionToken.connect(User).approve(trader.address, MILLION_ETHER)
      await redeemToken.connect(User).approve(trader.address, MILLION_ETHER)

      // Setup initial state and make the option expired
      let inputUnderlyings = THOUSAND_ETHER

      // Mint underlying tokens so we can use them to mint options
      await underlyingToken.mint(Alice, inputUnderlyings)
      await trader.safeMint(optionToken.address, inputUnderlyings, Alice)
      // Do the same for the other signer account
      await underlyingToken.mint(Bob, ONE_ETHER)
      await trader.connect(User).safeMint(optionToken.address, ONE_ETHER, Bob)

      // Expire the option and check to make sure it has the expired timestamp as a parameter
      let expired = '1589386232'
      await optionToken.setExpiry(expired)
      assert.equal(await optionToken.getExpiryTime(), expired)
    })

    safeUnwind = async (inputOptions) => {
      let inputRedeems = inputOptions.mul(quote).div(base)

      let underlyingBal = await getTokenBalance(underlyingToken, Alice)
      let optionBal = await getTokenBalance(optionToken, Alice)
      let redeemBal = await getTokenBalance(redeemToken, Alice)

      await expect(trader.safeUnwind(optionToken.address, inputOptions, Alice))
        .to.emit(trader, 'TraderUnwind')
        .withArgs(Alice, optionToken.address, inputOptions.toString())

      let underlyingsChange = (await getTokenBalance(underlyingToken, Alice)).sub(underlyingBal)
      let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(optionBal)
      let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(redeemBal)

      assertBNEqual(underlyingsChange, inputOptions)
      assertBNEqual(optionsChange, 0)
      assertBNEqual(redeemsChange, inputRedeems.mul(-1))
    }

    it('should revert if amount is 0', async () => {
      await expect(trader.safeUnwind(optionToken.address, 0, Alice)).to.be.revertedWith(ERR_ZERO)
    })

    it('should revert if user does not have enough redeemToken tokens', async () => {
      await redeemToken.transfer(Bob, await redeemToken.balanceOf(Alice), {
        from: Alice,
      })
      await expect(
        trader.safeUnwind(optionToken.address, ONE_ETHER, Alice, {
          from: Alice,
        })
      ).to.be.revertedWith(ERR_BAL_REDEEM)
    })

    it('should unwind consecutively', async () => {
      await safeUnwind(parseEther('0.4351'))
      await safeUnwind(ONE_ETHER)
      await safeUnwind(parseEther('2.5433'))
    })
  })

  describe('test bad ERC20', () => {
    beforeEach(async () => {
      underlyingToken = await setup.newBadERC20(Admin, 'Bad ERC20 Doesnt Return Bools', 'BADU')
      strikeToken = await setup.newBadERC20(Admin, 'Bad ERC20 Doesnt Return Bools', 'BADS')
      optionToken = await setup.newTestOption(Admin, underlyingToken.address, strikeToken.address, base, quote, expiry)
      redeemToken = await setup.newTestRedeem(Admin, Alice, optionToken.address)
      await optionToken.setRedeemToken(redeemToken.address)

      // Mint underlying tokens to use to mint options
      await underlyingToken.mint(Alice, THOUSAND_ETHER)
      await strikeToken.mint(Alice, THOUSAND_ETHER)
      await underlyingToken.approve(trader.address, THOUSAND_ETHER)
      await safeMint(THOUSAND_ETHER)
    })

    it('should revert on mint because transfer does not return a boolean', async () => {
      let inputOptions = HUNDRED_ETHER
      await expect(trader.safeMint(optionToken.address, HUNDRED_ETHER, Alice)).to.be.reverted
    })

    it('should revert on swap because transfer does not return a boolean', async () => {
      await expect(trader.safeExercise(optionToken.address, HUNDRED_ETHER, Alice)).to.be.reverted
    })

    it('should revert on redeemToken because transfer does not return a boolean', async () => {
      // no way to swap, because it reverts, so we need to send strikeToken and call updateCacheBalances()
      let inputStrikes = parseEther('0.5') // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
      await strikeToken.transfer(optionToken.address, inputStrikes)
      await optionToken.updateCacheBalances()
      await expect(trader.safeRedeem(optionToken.address, inputStrikes, Alice)).to.be.reverted
    })

    it('should revert on close because transfer does not return a boolean', async () => {
      await expect(trader.safeClose(optionToken.address, HUNDRED_ETHER, Alice)).to.be.reverted
    })

    it('should revert on unwind because its not expired yet', async () => {
      await expect(trader.safeUnwind(optionToken.address, HUNDRED_ETHER, Alice)).to.be.reverted
    })
  })
})
