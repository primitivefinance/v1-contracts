const chai = require("chai");
const BN = require("bn.js");
chai.use(require("chai-bn")(BN));
const TestERC20 = artifacts.require("TestERC20");
const BadERC20 = artifacts.require("BadERC20");
const OptionFactory = artifacts.require("OptionFactory");
const RedeemFactory = artifacts.require("RedeemFactory");
const Option = artifacts.require("Option");
const OptionTest = artifacts.require("OptionTest");
const Redeem = artifacts.require("Redeem");
const Registry = artifacts.require("Registry");
const Flash = artifacts.require("Flash");
const Weth = artifacts.require("WETH9");
const CTokenLike = artifacts.require("CTokenLike");
const OptionTemplateLib = artifacts.require("OptionTemplateLib");
const RedeemTemplateLib = artifacts.require("RedeemTemplateLib");
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
    let flash = await Flash.new(tokenP);
    return flash;
};

const newRegistry = async () => {
    let registry = await Registry.new();
    return registry;
};

const newOptionFactory = async (registry) => {
    if (!artifacts.contractWasLinked(OptionFactory)) {
        let oImpLib = await OptionTemplateLib.new();
        await OptionFactory.link(oImpLib);
    }
    if (!artifacts.contractWasLinked(RedeemFactory)) {
        let rImpLib = await RedeemTemplateLib.new();
        await RedeemFactory.link(rImpLib);
    }
    let optionFactory = await OptionFactory.new(registry.address);
    let redeemTokenFactory = await RedeemFactory.new(registry.address);
    await optionFactory.deployOptionImplementation();
    await redeemTokenFactory.deployRedeemImplementation();
    await registry.initialize(
        optionFactory.address,
        redeemTokenFactory.address
    );
    return optionFactory;
};

const newInterestBearing = async (underlying, name, symbol) => {
    let compound = await CTokenLike.new(underlying, name, symbol);
    return compound;
};

const newTestOption = async (
    underlyingToken,
    strikeToken,
    base,
    quote,
    expiry
) => {
    let optionToken = await OptionTest.new();
    await optionToken.initialize(
        underlyingToken,
        strikeToken,
        base,
        quote,
        expiry
    );
    return optionToken;
};

const newTestRedeem = async (factory, optionToken, underlying) => {
    let redeemTokenToken = await Redeem.new();
    await redeemTokenToken.initialize(factory, optionToken, underlying);
    return redeemTokenToken;
};

const newOption = async (
    registry,
    underlyingToken,
    strikeToken,
    base,
    quote,
    expiry
) => {
    await registry.addSupported(underlyingToken);
    await registry.addSupported(strikeToken);
    await registry.deployOption(
        underlyingToken,
        strikeToken,
        base,
        quote,
        expiry
    );
    let optionToken = await Option.at(
        await registry.activeOptions(
            ((await registry.optionsLength()) - 1).toString()
        )
    );
    return optionToken;
};

const newRedeem = async (optionToken) => {
    let redeemTokenAddress = await optionToken.redeemToken();
    let redeemToken = await Redeem.at(redeemTokenAddress);
    return redeemToken;
};

const newPrimitive = async (
    registry,
    underlying,
    strike,
    base,
    quote,
    expiry
) => {
    let underlyingToken = underlying;
    let strikeToken = strike;

    let optionToken = await newOption(
        registry,
        underlyingToken.address,
        strikeToken.address,
        base,
        quote,
        expiry
    );
    let redeemToken = await newRedeem(optionToken);

    const Primitive = {
        underlyingToken: underlyingToken,
        strikeToken: strikeToken,
        optionToken: optionToken,
        redeemToken: redeemToken,
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
    newOption,
    newRedeem,
    newTestRedeem,
    newFlash,
    newTestOption,
    newRegistry,
    newOptionFactory,
    newInterestBearing,
    newPrimitive,
    approveToken,
};
