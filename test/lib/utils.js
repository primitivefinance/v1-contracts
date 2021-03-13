const { assert, expect } = require('chai')
const { ethers } = require('hardhat')
const { parseEther } = ethers.utils
const { AddressZero } = ethers.constants

/**
 * @dev If the allowance of an account is less than some large amount, approve a large amount.
 * @param {*} owner The signer account calling the transaction.
 * @param {*} spender The signer account that should be approved.
 * @param {*} token The ERC-20 token to update its allowance mapping.
 */
const checkAllowance = async (owner, spender, token) => {
  const amount = parseEther('10000000000')
  let allowance = await token.allowance(owner.address, spender.address)
  if (allowance <= amount) {
    await token.approve(spender.address, amount, { from: owner.address })
  }
}

/**
 * @dev Checks the Registry contract to make sure it has set its factory addresses.
 * @param {*} registry The Registry contract instance.
 * @param {*} optionFactory The OptionFactory contract instance.
 * @param {*} redeemFactory The RedeemFactory contract instance.
 */
const checkInitialization = async (registry, optionFactory, redeemFactory) => {
  const optionFactoryAddress = await registry.optionFactory()
  const redeemFactoryAddress = await registry.redeemFactory()
  if (optionFactoryAddress == AddressZero) {
    await registry.setOptionFactory(optionFactory.address)
  }
  if (redeemFactoryAddress == AddressZero) {
    await registry.setRedeemFactory(redeemFactory.address)
  }
}

const assertBNEqual = (actualBN, expectedBN, message) => {
  assert.equal(actualBN.toString(), expectedBN.toString(), message)
}

const assertWithinError = (actualBN, expectedBN, message) => {
  error = 1
  if (expectedBN !== 0) {
    let max = expectedBN.add(expectedBN.div(error))
    let min = expectedBN.sub(expectedBN.div(error))
    if (actualBN.gt(0)) {
      expect(actualBN).to.be.at.most(max)
      expect(actualBN).to.be.at.least(min)
    } else {
      expect(actualBN).to.be.at.most(0)
    }
  } else {
    expect(actualBN).to.be.eq(0)
  }
}

/**
 * @dev A generalized function to get the token balance of an address.
 * @param {*} token The ERC-20 token contract instance.
 * @param {*} address The address of the account to check the balance of.
 */
const getTokenBalance = async (token, address) => {
  let bal = await token.balanceOf(address)
  return bal
}

/**
 * @dev Asserts the actual balances of underlying and strike tokens matches the cache balances.
 *      Asserts the balances of option and redeem tokens is 0.
 * @param {*} underlyingToken The contract instance of the underlying token.
 * @param {*} strikeToken The contract instance of the strike token.
 * @param {*} optionToken The contract instance of the option token.
 * @param {*} redeem The contract instance of the redeem token.
 */
const verifyOptionInvariants = async (underlyingToken, strikeToken, optionToken, redeem) => {
  let underlyingBalance = await underlyingToken.balanceOf(optionToken.address)
  let underlyingCache = await optionToken.underlyingCache()
  let strikeCache = await optionToken.strikeCache()
  let strikeBalance = await strikeToken.balanceOf(optionToken.address)
  let optionBalance = await optionToken.balanceOf(optionToken.address)
  let redeemBalance = await redeem.balanceOf(optionToken.address)
  let optionTotalSupply = await optionToken.totalSupply()

  assertBNEqual(underlyingBalance, optionTotalSupply)
  assertBNEqual(underlyingCache, optionTotalSupply)
  assertBNEqual(strikeBalance, strikeCache)
  assertBNEqual(optionBalance, 0)
  assertBNEqual(redeemBalance, 0)
}

/**
 * @dev Gets the token balances for the four tokens, underlying, strike, option, and redeem.
 * @param {*} Primitive An object returned by the ../lib/setup function `newPrimitive()`
 * @param {*} address The address to check the balance of.
 */
const getTokenBalances = async (Primitive, address) => {
  const underlyingBalance = await getTokenBalance(Primitive.underlyingToken, address)
  const strikeBalance = await getTokenBalance(Primitive.strikeToken, address)
  const redeemBalance = await getTokenBalance(Primitive.redeemToken, address)
  const optionBalance = await getTokenBalance(Primitive.optionToken, address)

  const tokenBalances = {
    underlyingBalance,
    strikeBalance,
    redeemBalance,
    optionBalance,
  }
  return tokenBalances
}

const sortTokens = (tokenA, tokenB) => {
  let tokens = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
  return tokens
}

module.exports = {
  sortTokens,
  assertBNEqual,
  verifyOptionInvariants,
  getTokenBalances,
  getTokenBalance,
  checkAllowance,
  checkInitialization,
  assertWithinError,
}
