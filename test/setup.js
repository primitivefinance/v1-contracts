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
const constants = require("./constants");
const { MILLION_ETHER } = constants.VALUES;

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

const setupOption = async (
    factory,
    underlying,
    strike,
    base,
    price,
    expiry
) => {
    let _tokenU = underlying;
    let _tokenS = strike;
    let tokenU = underlying.address;
    let tokenS = strike.address;

    let prime = await newPrime(factory, tokenU, tokenS, base, price, expiry);
    let tokenP = prime.address;
    let redeem = await newRedeem(prime);
    let tokenR = redeem.address;

    const Primitive = {
        _tokenU: _tokenU,
        _tokenS: _tokenS,
        prime: prime,
        tokenP: tokenP,
        tokenR: tokenR,
        redeem: redeem,
    };
    return Primitive;
};

const approveToken = async (token, owner, spender) => {
    await token.approve(spender, MILLION_ETHER, { from: owner });
};

module.exports = {
    newERC20,
    newPrime,
    newRedeem,
    newPerpetual,
    newOptionFactory,
    newInterestBearing,
    setupOption,
    approveToken,
};
