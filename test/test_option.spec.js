// Testing suite tools
const { assert, expect } = require('chai')
const chai = require('chai')
const { solidity } = require('ethereum-waffle')
chai.use(solidity)

// Convert to wei
const { parseEther, parseUnits } = require('ethers/lib/utils')

// Helper functions and constants
const utils = require('./lib/utils')
const setup = require('./lib/setup')
const constants = require('./lib/constants')
const { assertBNEqual, verifyOptionInvariants, getTokenBalances, getTokenBalance } = utils

const { ONE_ETHER, FIVE_ETHER, FIFTY_ETHER, HUNDRED_ETHER, THOUSAND_ETHER, MILLION_ETHER } = constants.VALUES

const { ERR_ZERO, ERR_EXPIRED, ERR_NOT_VALID, ERR_NOT_OWNER, ERR_BAL_STRIKE, ERR_BAL_UNDERLYING } = constants.ERR_CODES

const { ZERO_ADDRESS } = constants.ADDRESSES

describe('Option Contract', () => {
  // Accounts
  let Admin, User, Alice

  // Tokens
  let weth, dai, optionToken

  // Option Parameters
  let underlyingToken, strikeToken, base, quote, expiry

  // Periphery and Administrative contracts
  let registry, optionFactoryAddress

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
    optionFactoryAddress = await registry.optionFactory()

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

    // Mint some WETH
    await weth.deposit({ value: FIFTY_ETHER })
  })

  describe('Registry', () => {
    it('getOptionAddress()', async () => {
      let option = await registry.getOptionAddress(underlyingToken.address, strikeToken.address, base, quote, expiry)
      expect(option).to.be.eq(optionToken.address)
    })

    it('reverts if one of the tokens in an option is address zero', async () => {
      await expect(registry.deployOption(ZERO_ADDRESS, strikeToken.address, base, quote, expiry)).to.be.revertedWith(
        'ERR_ZERO_ADDRESS'
      )
    })
  })

  describe('Redeem', () => {
    it('symbol()', async () => {
      assert.equal((await redeemToken.symbol()).toString(), 'RDM', 'Incorrect symbol')
    })
    it('name()', async () => {
      assert.equal((await redeemToken.name()).toString(), 'Primitive V1 Redeem', 'Incorrect name')
    })
    it('decimals()', async () => {
      assert.equal((await redeemToken.decimals()).toString(), 18, 'Incorrect decimals')
    })
    it('factory()', async () => {
      assert.equal((await redeemToken.factory()).toString(), registry.address, 'Incorrect controller')
    })
    it('optionToken()', async () => {
      assert.equal((await redeemToken.optionToken()).toString(), optionToken.address, 'Incorrect optionToken')
    })
    it('should revert on mint if msg.sender is not optionToken contract', async () => {
      await expect(redeemToken.mint(Alice, 10)).to.be.revertedWith(ERR_NOT_VALID)
    })
    it('should revert on burn if msg.sender is not optionToken contract', async () => {
      await expect(redeemToken.burn(Alice, 10)).to.be.revertedWith(ERR_NOT_VALID)
    })
  })
  describe('Option', () => {
    it('should return the correct name', async () => {
      assert.equal((await optionToken.name()).toString(), 'Primitive V1 Option', 'Incorrect name')
    })
    it('should return the correct decimals', async () => {
      assert.equal((await optionToken.decimals()).toString(), '18', 'Incorrect decimals')
    })
    it('should return the correct symbol', async () => {
      assert.equal((await optionToken.symbol()).toString(), 'PRM', 'Incorrect symbol')
    })
    it('should return the correct underlyingToken', async () => {
      assert.equal(
        (await optionToken.getUnderlyingTokenAddress()).toString(),
        underlyingToken.address,
        'Incorrect underlyingToken'
      )
    })

    it('should return the correct strikeToken', async () => {
      assert.equal((await optionToken.getStrikeTokenAddress()).toString(), strikeToken.address, 'Incorrect strikeToken')
    })

    it('should return the correct redeemToken', async () => {
      assert.equal((await optionToken.redeemToken()).toString(), redeemToken.address, 'Incorrect redeemToken')
    })

    it('should return the correct base', async () => {
      assert.equal((await optionToken.getBaseValue()).toString(), base, 'Incorrect base')
    })

    it('should return the correct quote', async () => {
      assert.equal((await optionToken.getQuoteValue()).toString(), quote, 'Incorrect quote')
    })

    it('should return the correct expiry', async () => {
      assert.equal((await optionToken.getExpiryTime()).toString(), expiry, 'Incorrect expiry')
    })

    it('should return the correct optionToken', async () => {
      let result = await optionToken.getParameters()
      assert.equal(result._underlyingToken.toString(), underlyingToken.address, 'Incorrect underlying')
      assert.equal(result._strikeToken.toString(), strikeToken.address, 'Incorrect strike')
      assert.equal(result._redeemToken.toString(), redeemToken.address, 'Incorrect redeem')
      assert.equal(result._base.toString(), base, 'Incorrect base')
      assert.equal(result._quote.toString(), quote, 'Incorrect quote')
      assert.equal(result._expiry.toString(), expiry, 'Incorrect expiry')
    })

    it('should get the tokens', async () => {
      let result = await optionToken.getAssetAddresses()
      assert.equal(result[0].toString(), underlyingToken.address, 'Incorrect underlyingToken')
      assert.equal(result[1].toString(), strikeToken.address, 'Incorrect strikeToken')
      assert.equal(result[2].toString(), redeemToken.address, 'Incorrect redeemToken')
    })

    it('should get the cache balances', async () => {
      let result = await optionToken.getCacheBalances()
      assert.equal(result[0].toString(), '0', 'Incorrect underlyingCache')
      assert.equal(result[1].toString(), '0', 'Incorrect strikeCache')
    })

    it('should return the correct initial underlyingCache', async () => {
      assert.equal((await optionToken.underlyingCache()).toString(), 0, 'Incorrect underlyingCache')
    })

    it('should return the correct initial strikeCache', async () => {
      assert.equal((await optionToken.strikeCache()).toString(), 0, 'Incorrect strikeCache')
    })

    it('should return the correct initial factory', async () => {
      assert.equal((await optionToken.factory()).toString(), optionFactoryAddress, 'Incorrect factory')
    })

    it('should return the correct optionToken for redeemToken', async () => {
      assert.equal((await redeemToken.optionToken()).toString(), optionToken.address, 'Incorrect optionToken')
    })

    it('should return the correct controller for redeemToken', async () => {
      assert.equal((await redeemToken.factory()).toString(), registry.address, 'Incorrect factory')
    })

    describe('initRedeemToken', () => {
      it('revert if msg.sender is not owner', async () => {
        await expect(optionToken.connect(Bob).initRedeemToken(Alice)).to.be.revertedWith(ERR_NOT_OWNER)
      })
    })

    describe('mintOptions()', () => {
      beforeEach(async () => {
        registry = await setup.newRegistry(Admin)
        factoryOption = await setup.newOptionFactory(Admin, registry)
        Primitive = await setup.newPrimitive(Admin, registry, underlyingToken, strikeToken, base, quote, expiry)

        optionToken = Primitive.optionToken
        redeemToken = Primitive.redeemToken
      })

      /**
       * @dev Function to call the mintOptions() function and check the invariants.
       * @param inputUnderlyings Quantity of underlying tokens deposited, which will mint options 1:1.
       */
      mint = async (inputUnderlyings) => {
        // Calculate how many redeem tokens are expected to be received.
        // Quantity of options received is at a 1:1 ratio with deposited underlying tokens.
        let outputRedeems = inputUnderlyings.mul(quote).div(base)

        // Get the balances
        const { underlyingBalance, strikeBalance, optionBalance, redeemBalance } = await getTokenBalances(Primitive, Alice)

        // This operation should be initiated by a contract, but for our test, we assume
        // there is no other account that will back-run our transaction. We send tokens prior
        // to calling the Option contract's functions.
        await underlyingToken.transfer(optionToken.address, inputUnderlyings)

        // Call the mintOptions() function and check the emitted event and event arguments.
        await expect(optionToken.mintOptions(Alice))
          .to.emit(optionToken, 'Mint')
          .withArgs(Alice, inputUnderlyings.toString(), outputRedeems.toString())
          .to.emit(optionToken, 'UpdatedCacheBalances')

        // Calculate the change in token balances after a mint.
        let underlyingsChange = (await getTokenBalance(underlyingToken, Alice)).sub(underlyingBalance)
        let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(optionBalance)
        let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(redeemBalance)

        // Assert the changes match the expected changes.
        assertBNEqual(underlyingsChange, inputUnderlyings.mul(-1))
        assertBNEqual(optionsChange, inputUnderlyings)
        assertBNEqual(redeemsChange, outputRedeems)

        // Verify the balances in the contracts are the expected values.
        await verifyOptionInvariants(underlyingToken, strikeToken, optionToken, redeemToken)
      }

      it('revert if no tokens were sent to contract', async () => {
        await expect(optionToken.mintOptions(Alice)).to.be.revertedWith(ERR_ZERO)
      })

      it('mint optionToken and redeemToken to Alice', async () => {
        let inputUnderlyings = ONE_ETHER
        await mint(inputUnderlyings)
      })

      it('should revert by sending 1 wei of underlyingToken to optionToken and call mint', async () => {
        let inputUnderlyings = '1'
        await underlyingToken.transfer(optionToken.address, inputUnderlyings)
        await expect(optionToken.mintOptions(Alice)).to.be.revertedWith(ERR_ZERO)
      })
    })

    describe('exerciseOptions()', () => {
      beforeEach(async () => {
        registry = await setup.newRegistry(Admin)
        factoryOption = await setup.newOptionFactory(Admin, registry)
        Primitive = await setup.newPrimitive(Admin, registry, underlyingToken, strikeToken, base, quote, expiry)

        optionToken = Primitive.optionToken
        redeemToken = Primitive.redeemToken
      })

      /**
       * @dev A function to call the exerciseOptions() function and check the invariants.
       * @param inputOptions The quantity of option tokens to exercise.
       */
      exercise = async (inputOptions) => {
        // Calculate the quantity of strike tokens needed to exercise the option tokens.
        let inputStrikes = inputOptions.mul(quote).div(base)
        // If theres a fee, add it to required strike token payment.
        let fee = 0

        const { underlyingBalance, strikeBalance, optionBalance, redeemBalance } = await getTokenBalances(Primitive, Alice)

        if (underlyingToken.address == weth.address) {
          await strikeToken.deposit({ value: fee.add(inputStrikes) })
        }

        // Transfer in the required tokens, then call the function
        await optionToken.transfer(optionToken.address, inputOptions)
        await strikeToken.transfer(optionToken.address, inputStrikes.add(fee))

        await expect(optionToken.exerciseOptions(Alice, inputOptions, []))
          .to.emit(optionToken, 'Exercise')
          .withArgs(Alice, inputOptions, inputStrikes.add(fee))
          .and.to.emit(optionToken, 'UpdatedCacheBalances')

        // Calculate the actual changes and compare them to the expected.
        let underlyingsChange = (await getTokenBalance(underlyingToken, Alice)).sub(underlyingBalance)
        let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(optionBalance)
        let strikesChange = (await getTokenBalance(strikeToken, Alice)).sub(strikeBalance)

        assertBNEqual(underlyingsChange, inputOptions)
        assertBNEqual(optionsChange, inputOptions.mul(-1))
        assertBNEqual(strikesChange, inputStrikes.add(fee).mul(-1))

        // Check the balances at the contract level.
        await verifyOptionInvariants(underlyingToken, strikeToken, optionToken, redeemToken)
      }

      it('revert if 0 underlyingToken requested to be taken out', async () => {
        await expect(optionToken.exerciseOptions(Alice, 0, [])).to.be.revertedWith(ERR_ZERO)
      })

      it('revert if not enough underlying tokens to take', async () => {
        await expect(optionToken.exerciseOptions(Alice, ONE_ETHER, [])).to.be.revertedWith(ERR_BAL_UNDERLYING)
      })

      it('reverts if outputUnderlyings > inputOptions, not enough optionToken was sent in', async () => {
        // Mint some options to use
        await mint(parseEther('0.01'))
        // Transfer the options to the option contract so we can call exerciseOptions()
        await optionToken.transfer(optionToken.address, parseEther('0.01'))
        // Assuming the strike token is WETH, mint some WETH with deposit then transfer to option contract
        await strikeToken.deposit({ value: quote })
        await strikeToken.transfer(optionToken.address, quote)
        // Calling exerciseOptions should revert because we sent in an incorrect balance of strike tokens
        await expect(optionToken.exerciseOptions(Alice, quote, [])).to.be.revertedWith(ERR_BAL_UNDERLYING)
        // Sync the actual balances with the cache balances
        await optionToken.updateCacheBalances()
      })

      it('reverts if 0 strikeToken and 0 underlyingToken are sent into contract', async () => {
        await mint(FIVE_ETHER)
        await expect(optionToken.exerciseOptions(Alice, ONE_ETHER, [])).to.be.revertedWith(ERR_ZERO)
      })

      it('should revert because no optionToken were sent to contract', async () => {
        await mint(FIVE_ETHER)
        await strikeToken.transfer(optionToken.address, quote)
        await expect(optionToken.exerciseOptions(Alice, ONE_ETHER, [])).to.be.revertedWith('ERR_OPTIONS_INPUT')
      })

      it('exercises consecutively', async () => {
        let inputOptions = ONE_ETHER
        await mint(inputOptions)
        await strikeToken.deposit({ value: quote })
        await exercise(parseEther('0.1'))
        await exercise(parseEther('0.34521'))

        // Interesting, the two 0s at the end of this are necessary. If they are not 0s, the
        // returned value will be unequal because the accuracy of the mint is only 10^16.
        // This should be verified further.
        await exercise(parseUnits('2323234235200', 'wei'))
      })
    })

    describe('redeemStrikeTokens()', () => {
      beforeEach(async () => {
        registry = await setup.newRegistry(Admin)
        factoryOption = await setup.newOptionFactory(Admin, registry)
        Primitive = await setup.newPrimitive(Admin, registry, underlyingToken, strikeToken, base, quote, expiry)

        optionToken = Primitive.optionToken
        redeemToken = Primitive.redeemToken
      })

      redeemStrikeTokens = async (inputRedeems) => {
        const { underlyingBalance, strikeBalance, optionBalance, redeemBalance } = await getTokenBalances(Primitive, Alice)

        await redeemToken.transfer(optionToken.address, inputRedeems)
        await expect(optionToken.redeemStrikeTokens(Alice))
          .to.emit(optionToken, 'Redeem')
          .withArgs(Alice, inputRedeems.toString())
          .and.to.emit(optionToken, 'UpdatedCacheBalances')

        let strikesChange = (await getTokenBalance(strikeToken, Alice)).sub(strikeBalance)
        let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(redeemBalance)

        assertBNEqual(strikesChange, inputRedeems)
        assertBNEqual(redeemsChange, inputRedeems.mul(-1))

        await verifyOptionInvariants(underlyingToken, strikeToken, optionToken, redeemToken)
      }

      it('revert if 0 redeemToken were sent to contract', async () => {
        await expect(optionToken.redeemStrikeTokens(Alice)).to.be.revertedWith(ERR_ZERO)
      })

      it('reverts if not enough strikeToken in optionToken contract', async () => {
        await mint(parseEther('200'))
        await redeemToken.transfer(optionToken.address, parseEther('1'))
        await expect(optionToken.redeemStrikeTokens(Alice)).to.be.revertedWith(ERR_BAL_STRIKE)
        await optionToken.updateCacheBalances()
      })

      it('redeemTokens consecutively', async () => {
        let inputRedeems = ONE_ETHER
        let inputUnderlyings = inputRedeems.mul(base).div(quote)
        await mint(inputUnderlyings)
        await exercise(inputUnderlyings)
        await redeemStrikeTokens(parseEther('0.1'))
        await redeemStrikeTokens(parseEther('0.34521'))
        await redeemStrikeTokens(parseUnits('23232342352345', 'wei'))
      })
    })

    describe('closeOptions()', () => {
      beforeEach(async () => {
        registry = await setup.newRegistry(Admin)
        factoryOption = await setup.newOptionFactory(Admin, registry)
        Primitive = await setup.newPrimitive(Admin, registry, underlyingToken, strikeToken, base, quote, expiry)

        optionToken = Primitive.optionToken
        redeemToken = Primitive.redeemToken
      })

      close = async (inputOptions) => {
        let inputRedeems = inputOptions.mul(quote).div(base)

        const { underlyingBalance, strikeBalance, optionBalance, redeemBalance } = await getTokenBalances(Primitive, Alice)

        await optionToken.transfer(optionToken.address, inputOptions)
        await redeemToken.transfer(optionToken.address, inputRedeems)

        await expect(optionToken.closeOptions(Alice))
          .to.emit(optionToken, 'Close')
          .withArgs(Alice, inputOptions.toString())
          .and.to.emit(optionToken, 'UpdatedCacheBalances')

        let underlyingsChange = (await getTokenBalance(underlyingToken, Alice)).sub(underlyingBalance)
        let optionsChange = (await getTokenBalance(optionToken, Alice)).sub(optionBalance)
        let redeemsChange = (await getTokenBalance(redeemToken, Alice)).sub(redeemBalance)

        assertBNEqual(underlyingsChange, inputOptions)
        assertBNEqual(optionsChange, inputOptions.mul(-1))
        assertBNEqual(redeemsChange, inputRedeems.mul(-1))

        await verifyOptionInvariants(underlyingToken, strikeToken, optionToken, redeemToken)
      }

      it('revert if 0 redeemToken were sent to contract', async () => {
        let inputOptions = ONE_ETHER
        await mint(inputOptions)
        await optionToken.transfer(optionToken.address, inputOptions)
        await expect(optionToken.closeOptions(Alice)).to.be.revertedWith(ERR_ZERO)
      })

      it('revert if 0 optionToken were sent to contract', async () => {
        let inputOptions = ONE_ETHER
        await mint(inputOptions)
        let inputRedeems = inputOptions.mul(quote).div(base)
        await redeemToken.transfer(optionToken.address, inputRedeems)
        await expect(optionToken.closeOptions(Alice)).to.be.revertedWith(ERR_ZERO)
      })

      it('revert if no tokens were sent to contract', async () => {
        await expect(optionToken.closeOptions(Alice)).to.be.revertedWith(ERR_ZERO)
      })

      it('revert if not enough optionToken was sent into contract', async () => {
        let inputOptions = ONE_ETHER
        await mint(inputOptions)
        let inputRedeems = inputOptions.mul(quote).div(base)
        await redeemToken.transfer(optionToken.address, inputRedeems)
        await optionToken.transfer(optionToken.address, parseEther('0.5'))
        await expect(optionToken.closeOptions(Alice)).to.be.revertedWith(ERR_BAL_UNDERLYING)
      })

      // Interesting, the two 0s at the end of this are necessary. If they are not 0s, the
      // returned value will be unequal because the accuracy of the mint is only 10^16.
      // This should be verified further.
      it('closes consecutively', async () => {
        let inputUnderlyings = parseEther('200')
        await mint(inputUnderlyings)
        await close(parseEther('0.1'))
        await close(parseEther('0.34521'))
        await close(parseUnits('234235000', 'wei'))
      })
    })

    describe('full test', () => {
      beforeEach(async () => {
        registry = await setup.newRegistry(Admin)
        factoryOption = await setup.newOptionFactory(Admin, registry)
        Primitive = await setup.newPrimitive(Admin, registry, underlyingToken, strikeToken, base, quote, expiry)

        optionToken = Primitive.optionToken
        redeemToken = Primitive.redeemToken
      })

      it('handles multiple transactions', async () => {
        // Start with 1000 s
        await underlyingToken.mint(Alice, THOUSAND_ETHER)
        let inputUnderlyings = THOUSAND_ETHER
        await mint(inputUnderlyings)
        await close(ONE_ETHER)
        await exercise(parseEther('200'))
        await redeemStrikeTokens(parseEther('0.1'))
        await close(ONE_ETHER)
        await exercise(ONE_ETHER)
        await exercise(ONE_ETHER)
        await exercise(ONE_ETHER)
        await exercise(ONE_ETHER)
        await redeemStrikeTokens(parseEther('0.23'))
        await redeemStrikeTokens(parseEther('0.1234'))
        await redeemStrikeTokens(parseEther('0.15'))
        await redeemStrikeTokens(parseEther('0.2543'))
        await close(FIVE_ETHER)
        await close(await optionToken.balanceOf(Alice))
        await redeemStrikeTokens(await redeemToken.balanceOf(Alice))
      })
    })

    describe('update', () => {
      beforeEach(async () => {
        registry = await setup.newRegistry(Admin)
        factoryOption = await setup.newOptionFactory(Admin, registry)
        Primitive = await setup.newPrimitive(Admin, registry, underlyingToken, strikeToken, base, quote, expiry)

        optionToken = Primitive.optionToken
        redeemToken = Primitive.redeemToken
      })

      it('should update the cached balances with the current balances', async () => {
        await underlyingToken.mint(Alice, THOUSAND_ETHER)
        let inputUnderlyings = THOUSAND_ETHER
        let inputStrikes = inputUnderlyings.mul(quote).div(base)
        await strikeToken.deposit({ value: inputStrikes })
        await mint(inputUnderlyings)
        await underlyingToken.transfer(optionToken.address, inputUnderlyings)
        await strikeToken.transfer(optionToken.address, inputStrikes)
        await redeemToken.transfer(optionToken.address, inputStrikes)
        await expect(optionToken.updateCacheBalances()).to.emit(optionToken, 'UpdatedCacheBalances')

        let underlyingCache = await optionToken.underlyingCache()
        let strikeCache = await optionToken.strikeCache()
        let underlyingBalance = await getTokenBalance(underlyingToken, optionToken.address)
        let strikeBalance = await getTokenBalance(strikeToken, optionToken.address)

        assertBNEqual(underlyingCache, underlyingBalance)
        assertBNEqual(strikeCache, strikeBalance)
      })
    })

    describe('test expired', () => {
      beforeEach(async () => {
        optionToken = await setup.newTestOption(Admin, underlyingToken.address, strikeToken.address, base, quote, expiry)
        redeemToken = await setup.newTestRedeem(Admin, Alice, optionToken.address)
        await optionToken.setRedeemToken(redeemToken.address)
        let inputUnderlyings = THOUSAND_ETHER
        await underlyingToken.mint(Alice, inputUnderlyings)
        await underlyingToken.transfer(optionToken.address, inputUnderlyings)
        await optionToken.mintOptions(Alice)
        let expired = '1589386232'
        await optionToken.setExpiry(expired)
      })

      it('should be expired', async () => {
        let expired = '1589386232'
        assert.equal(await optionToken.getExpiryTime(), expired)
      })

      it('should close position with just redeemToken tokens after expiry', async () => {
        let cache0U = await optionToken.underlyingCache()
        let cache0S = await optionToken.strikeCache()
        let balance0R = await redeemToken.totalSupply()
        let balance0U = await getTokenBalance(underlyingToken, Alice)
        let balance0CU = await getTokenBalance(underlyingToken, optionToken.address)
        let balance0S = await getTokenBalance(strikeToken, optionToken.address)

        let inputRedeems = await redeemToken.balanceOf(Alice)
        await redeemToken.transfer(optionToken.address, inputRedeems)
        await optionToken.closeOptions(Alice)

        let balance1R = await redeemToken.totalSupply()
        let balance1U = await getTokenBalance(underlyingToken, Alice)
        let balance1CU = await getTokenBalance(underlyingToken, optionToken.address)
        let balance1S = await getTokenBalance(strikeToken, optionToken.address)

        let redeemsChange = balance1R.sub(balance0R)
        let underlyingsChange = balance1U.sub(balance0U)
        let deltaCU = balance1CU.sub(balance0CU)
        let strikesChange = balance1S.sub(balance0S)

        assertBNEqual(redeemsChange, inputRedeems.mul(-1))
        assertBNEqual(underlyingsChange, cache0U)
        assertBNEqual(deltaCU, cache0U.mul(-1))
        assertBNEqual(strikesChange, cache0S)
      })

      it('revert when calling mint on an expired optionToken', async () => {
        await expect(optionToken.mintOptions(Alice)).to.be.revertedWith(ERR_EXPIRED)
      })

      it('revert when calling swap on an expired optionToken', async () => {
        await expect(optionToken.exerciseOptions(Alice, 1, [])).to.be.revertedWith(ERR_EXPIRED)
      })
    })

    describe('test bad ERC20', () => {
      beforeEach(async () => {
        underlyingToken = await setup.newBadERC20(Admin, 'Bad ERC20 Doesnt Return Bools', 'BADU')
        strikeToken = await setup.newBadERC20(Admin, 'Bad ERC20 Doesnt Return Bools', 'BADS')
        optionToken = await setup.newTestOption(Admin, underlyingToken.address, strikeToken.address, base, quote, expiry)
        redeemToken = await setup.newTestRedeem(Admin, Alice, optionToken.address)
        await optionToken.setRedeemToken(redeemToken.address)
        let inputUnderlyings = THOUSAND_ETHER
        await underlyingToken.mint(Alice, inputUnderlyings)
        await strikeToken.mint(Alice, inputUnderlyings)
        await underlyingToken.transfer(optionToken.address, inputUnderlyings)
        await optionToken.mintOptions(Alice)
      })

      it('should revert on swap because option contract can handle bad erc20s', async () => {
        let inputOptions = HUNDRED_ETHER
        let inputStrikes = parseEther('0.515') // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
        await strikeToken.transfer(optionToken.address, inputStrikes)
        await optionToken.transfer(optionToken.address, inputOptions)
        await optionToken.exerciseOptions(Alice, inputOptions, [])
      })

      it('should not revert on redeemToken because option contract can handle bad erc20s', async () => {
        // no way to swap, because it reverts, so we need to send strikeToken and call update()
        let inputStrikes = parseEther('0.5') // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
        await strikeToken.transfer(optionToken.address, inputStrikes)
        await optionToken.updateCacheBalances()
        await redeemToken.transfer(optionToken.address, inputStrikes)
        await optionToken.redeemStrikeTokens(Alice)
      })

      it('should not revert on close because option contract can handle bad erc20s', async () => {
        // no way to swap, because it reverts, so we need to send strikeToken and call update()
        let inputOptions = HUNDRED_ETHER
        let inputRedeems = parseEther('0.5') // 100 ether (underlyingToken:base) / 200 (strikeToken:quote) = 0.5 strikeToken
        await redeemToken.transfer(optionToken.address, inputRedeems)
        await optionToken.transfer(optionToken.address, inputOptions)
        await optionToken.closeOptions(Alice)
      })
    })
  })
})
