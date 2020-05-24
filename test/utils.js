const { assert, expect } = require("chai");
const chai = require("chai");
const BN = require("bn.js");
const TestERC20 = artifacts.require("TestERC20");
const Factory = artifacts.require("Factory");
const FactoryRedeem = artifacts.require("FactoryRedeem");
const PrimeOption = artifacts.require("PrimeOption");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const PrimePerpetual = artifacts.require("PrimePerpetual");
const CTokenLike = artifacts.require("CTokenLike");
chai.use(require("chai-bn")(BN));

const { toWei } = web3.utils;
const { fromWei } = web3.utils;

const assertBNEqual = (actualBN, expectedBN, message) => {
    assert.equal(actualBN.toString(), expectedBN.toString(), message);
};

const assertWithinError = (actualBN, expectedBN, error, message) => {
    error = new BN(error);
    let max = expectedBN.add(expectedBN.div(error));
    let min = expectedBN.sub(expectedBN.div(error));
    if (actualBN.gt(new BN(0))) {
        expect(actualBN).to.be.a.bignumber.that.is.at.most(max);
        expect(actualBN).to.be.a.bignumber.that.is.at.least(min);
    } else {
        expect(actualBN).to.be.a.bignumber.that.is.at.most(new BN(0));
    }
};

const newERC20 = async (name, symbol, totalSupply) => {
    let erc20 = await TestERC20.new(name, symbol, totalSupply);
    return erc20;
};

const newOptionFactory = async () => {
    let factory = await Factory.new();
    let factoryRedeem = await FactoryRedeem.new(factory.address);
    await factory.initialize(factoryRedeem.address);
    return factory;
};

const newInterestBearing = async (underlying, name, symbol) => {
    let compound = await CTokenLike.new(underlying, name, symbol);
    return compound;
};

const newPrime = async (factory, tokenU, tokenS, base, price, expiry) => {
    await factory.deployOption(tokenU, tokenS, base, price, expiry);
    let id = await factory.getId(tokenU, tokenS, base, price, expiry);
    let prime = await PrimeOption.at(await factory.options(id));
    return prime;
};

const newRedeem = async (prime) => {
    let tokenR = await prime.tokenR();
    let redeem = await PrimeRedeem.at(tokenR);
    return redeem;
};

const newPerpetual = async (ctokenU, ctokenS, tokenP, receiver) => {
    let perpetual = await PrimePerpetual.new(
        ctokenU,
        ctokenS,
        tokenP,
        receiver
    );
    return perpetual;
};
module.exports = {
    toWei,
    fromWei,
    assertBNEqual,
    assertWithinError,
    newERC20,
    newPrime,
    newRedeem,
    newPerpetual,
    newOptionFactory,
    newInterestBearing,
};
