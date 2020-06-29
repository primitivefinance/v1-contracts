const { assert, expect } = require("chai");
const chai = require("chai");
const BN = require("bn.js");
const TestERC20 = artifacts.require("TestERC20");
const BadERC20 = artifacts.require("BadERC20");
const Factory = artifacts.require("Factory");
const FactoryRedeem = artifacts.require("FactoryRedeem");
const PrimeOption = artifacts.require("PrimeOption");
const PrimeOptionTest = artifacts.require("PrimeOptionTest");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const PrimePerpetual = artifacts.require("PrimePerpetual");
const Registry = artifacts.require("Registry");
const PrimeFlash = artifacts.require("PrimeFlash");
const Weth = artifacts.require("WETH9");
const CTokenLike = artifacts.require("CTokenLike");
chai.use(require("chai-bn")(BN));
const constants = require("./constants");
const { MILLION_ETHER } = constants.VALUES;

const newERC20 = async (name, symbol, totalSupply) => {
    let erc20 = await TestERC20.new(name, symbol, totalSupply);
    return erc20;
};

const newBadERC20 = async (name, symbol) => {
    let erc20 = await BadERC20.new(name, symbol);
    return erc20;
};

const newWeth = async () => {
    let weth = await Weth.new();
    return weth;
};

const newFlash = async (tokenP) => {
    let flash = await PrimeFlash.new(tokenP);
    return flash;
};

const newRegistry = async () => {
    let registry = await Registry.new();
    return registry;
};

const newOptionFactory = async (registry) => {
    let factory = await Factory.new(registry.address);
    let factoryRedeem = await FactoryRedeem.new(registry.address);
    await registry.initialize(factory.address, factoryRedeem.address);
    return factory;
};

const newInterestBearing = async (underlying, name, symbol) => {
    let compound = await CTokenLike.new(underlying, name, symbol);
    return compound;
};

const newTestOption = async (tokenU, tokenS, base, quote, expiry) => {
    let prime = await PrimeOptionTest.new(tokenU, tokenS, base, quote, expiry);
    return prime;
};

const newTestRedeem = async (factory, prime, underlying) => {
    let redeem = await PrimeRedeem.new(factory, prime, underlying);
    return redeem;
};

const newPrime = async (registry, tokenU, tokenS, base, quote, expiry) => {
    await registry.addSupported(tokenU);
    await registry.addSupported(tokenS);
    await registry.deployOption(tokenU, tokenS, base, quote, expiry);
    let prime = await PrimeOption.at(
        await registry.activeOptions(
            ((await registry.optionsLength()) - 1).toString()
        )
    );
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

const newPrimitive = async (
    registry,
    underlying,
    strike,
    base,
    quote,
    expiry
) => {
    let tokenU = underlying;
    let tokenS = strike;

    let prime = await newPrime(
        registry,
        tokenU.address,
        tokenS.address,
        base,
        quote,
        expiry
    );
    let redeem = await newRedeem(prime);

    const Primitive = {
        tokenU: tokenU,
        tokenS: tokenS,
        prime: prime,
        redeem: redeem,
    };
    return Primitive;
};

const approveToken = async (token, owner, spender) => {
    await token.approve(spender, MILLION_ETHER, { from: owner });
};

module.exports = {
    newERC20,
    newBadERC20,
    newWeth,
    newPrime,
    newRedeem,
    newTestRedeem,
    newFlash,
    newPerpetual,
    newTestOption,
    newRegistry,
    newOptionFactory,
    newInterestBearing,
    newPrimitive,
    approveToken,
};
