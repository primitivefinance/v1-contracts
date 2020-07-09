const TestERC20 = require("@primitivefi/contracts/artifacts/TestERC20");
const BadERC20 = require("@primitivefi/contracts/artifacts/BadERC20");
const OptionFactory = require("@primitivefi/contracts/artifacts/OptionFactory");
const RedeemFactory = require("@primitivefi/contracts/artifacts/RedeemFactory");
const Option = require("@primitivefi/contracts/artifacts/Option");
const OptionTest = require("@primitivefi/contracts/artifacts/OptionTest");
const Redeem = require("@primitivefi/contracts/artifacts/Redeem");
const Registry = require("@primitivefi/contracts/artifacts/Registry");
const Flash = require("@primitivefi/contracts/artifacts/Flash");
const Weth = require("@primitivefi/contracts/artifacts/WETH9");
const CTokenLike = require("@primitivefi/contracts/artifacts/CTokenLike");
const OptionTemplateLib = require("@primitivefi/contracts/artifacts/OptionTemplateLib");
const RedeemTemplateLib = require("@primitivefi/contracts/artifacts/RedeemTemplateLib");
const constants = require("./constants");
const { MILLION_ETHER } = constants.VALUES;
const { OPTION_TEMPLATE_LIB, REDEEM_TEMPLATE_LIB } = constants.LIBRARIES;
const { MockProvider, deployContract, link } = require("ethereum-waffle");
const { parseEther } = require("ethers/lib/utils");
const { ethers } = require("ethers");

const newWallets = () => {
    const wallets = new MockProvider().getWallets();
    return wallets;
};

const newERC20 = async (signer, name, symbol, totalSupply) => {
    const ERC20 = await deployContract(
        signer,
        TestERC20,
        [name, symbol, totalSupply],
        {
            gasLimit: 6000000,
        }
    );
    return ERC20;
};

const newBadERC20 = async (signer, name, symbol) => {
    const bad = await deployContract(signer, BadERC20, [name, symbol], {
        gasLimit: 6000000,
    });
    return bad;
};

const newWeth = async (signer) => {
    const weth = await deployContract(signer, Weth, [], {
        gasLimit: 6000000,
    });
    return weth;
};

const newFlash = async (signer, optionToken) => {
    const flash = await deployContract(signer, PrimeFlash, [optionToken], {
        gasLimit: 6000000,
    });
    return flash;
};

const newRegistry = async (signer) => {
    console.log("deploy registry");
    const registry = await deployContract(signer, Registry, [], {
        gasLimit: 6500000,
    });
    console.log("deployed registry");
    return registry;
};

const newOptionFactory = async (signer, registry) => {
    let oLib = await deployContract(signer, OptionTemplateLib, [], {
        gasLimit: 6000000,
    });
    let opFacContract = Object.assign(OptionFactory, {
        evm: { bytecode: { object: OptionFactory.bytecode } },
    });
    link(opFacContract, OPTION_TEMPLATE_LIB, oLib.address);

    let optionFactory = await deployContract(
        signer,
        opFacContract,
        [registry.address],
        {
            gasLimit: 6000000,
        }
    );
    let rLib = await deployContract(signer, RedeemTemplateLib, [], {
        gasLimit: 6000000,
    });

    let reFacContract = Object.assign(RedeemFactory, {
        evm: { bytecode: { object: RedeemFactory.bytecode } },
    });
    link(reFacContract, REDEEM_TEMPLATE_LIB, rLib.address);

    let redeemTokenFactory = await deployContract(
        signer,
        reFacContract,
        [registry.address],
        {
            gasLimit: 6000000,
        }
    );
    await optionFactory.deployOptionTemplate();
    await redeemTokenFactory.deployRedeemTemplate();
    await registry.initialize(
        optionFactory.address,
        redeemTokenFactory.address
    );
    return optionFactory;
};

const newInterestBearing = async (signer, underlying, name, symbol) => {
    const compound = await deployContract(
        signer,
        CTokenLike,
        [underlying, name, symbol],
        {
            gasLimit: 6000000,
        }
    );
    return compound;
};

const newTestOption = async (
    signer,
    underlyingToken,
    strikeToken,
    base,
    quote,
    expiry
) => {
    const optionToken = await deployContract(signer, OptionTest, [], {
        gasLimit: 6000000,
    });
    await optionToken.initialize(
        underlyingToken,
        strikeToken,
        base,
        quote,
        expiry
    );
    return optionToken;
};

const newTestRedeem = async (signer, factory, optionToken, underlying) => {
    const redeemToken = await deployContract(signer, Redeem, [], {
        gasLimit: 6000000,
    });
    await redeemToken.initialize(factory, optionToken, underlying);
    return redeemToken;
};

const newOption = async (
    signer,
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
    let optionToken = new ethers.Contract(
        await registry.activeOptions(
            ((await registry.optionsLength()) - 1).toString()
        ),
        Option.abi,
        signer
    );
    return optionToken;
};

const newRedeem = async (signer, optionToken) => {
    let redeemTokenAddress = await optionToken.redeemToken();
    let redeemToken = new ethers.Contract(
        redeemTokenAddress,
        Redeem.abi,
        signer
    );
    return redeemToken;
};

const newPrimitive = async (
    signer,
    registry,
    underlyingToken,
    strikeToken,
    base,
    quote,
    expiry
) => {
    let optionToken = await newOption(
        signer,
        registry,
        underlyingToken.address,
        strikeToken.address,
        base,
        quote,
        expiry
    );
    let redeemToken = await newRedeem(signer, optionToken);

    const Primitive = {
        underlyingToken: underlyingToken,
        strikeToken: strikeToken,
        optionToken: optionToken,
        redeemToken: redeemToken,
    };
    return Primitive;
};

const approveToken = async (token, signer, spender) => {
    await token.approve(spender, MILLION_ETHER, { from: signer });
};

module.exports = {
    newWallets,
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
