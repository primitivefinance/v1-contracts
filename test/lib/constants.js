const { ethers } = require("ethers");
const { parseEther } = ethers.utils;

// ERROR CODES
const ERR_CODES = {
    ERR_ZERO: "ERR_ZERO",
    ERR_BAL_ETH: "ERR_BAL_ETH",
    ERR_NOT_OWNER: "ERR_NOT_OWNER",
    ERR_NOT_VALID: "ERR_NOT_VALID",
    ERR_BAL_STRIKE: "ERR_BAL_STRIKE",
    ERR_BAL_REDEEM: "ERR_BAL_REDEEM",
    ERR_BAL_TOKENS: "ERR_BAL_TOKENS",
    ERR_BAL_OPTIONS: "ERR_BAL_OPTIONS",
    ERR_OPTION_TYPE: "ERR_OPTION_TYPE",
    ERR_PAUSED: "Pausable: paused",
    ERR_EXPIRED: "ERR_EXPIRED",
    ERR_NOT_EXPIRED: "ERR_NOT_EXPIRED",
    ERR_TRANSFER_OUT_FAIL: "ERR_TRANSFER_OUT_FAIL",
    ERR_FEED_INVALID: "ERR_FEED_INVALID",
    ERR_ZERO_LIQUIDITY: "ERR_ZERO_LIQUIDITY",
};

// CALCULATION PARAMETERS
const PARAMETERS = {
    FEE: 1000,
    ROUNDING_ERR: 10 ** 8,
    MIN_LIQUIDITY: 10 ** 4,
    ACCURACY: 10 ** 12,
    MAX_SLIPPAGE: 100,
    MAX_ERROR_PTS: 1.5,
    MANTISSA: 10 ** 36,
};

// COMMON VALUES
const VALUES = {
    ZERO: parseEther("0"),
    HUNDRETH: parseEther("0.01"),
    TENTH: parseEther("0.1"),
    ONE_ETHER: parseEther("1"),
    TWO_ETHER: parseEther("2"),
    FIVE_ETHER: parseEther("5"),
    TEN_ETHER: parseEther("10"),
    FIFTY_ETHER: parseEther("50"),
    HUNDRED_ETHER: parseEther("100"),
    THOUSAND_ETHER: parseEther("1000"),
    MILLION_ETHER: parseEther("1000000"),
};

// COMMON ADDRESSES
const ADDRESSES = {
    ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
    TREASURER: "0x9eb7f2591ed42dee9315b6e2aaf21ba85ea69f8c",
    MAINNET_DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    MAINNET_ORACLE: "0xdA17fbEdA95222f331Cb1D252401F4b44F49f7A0",
    MAINNET_COMPOUND_DAI: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
    MAINNET_COMPOUND_ETH: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
    MAINNET_WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    MAINNET_UNI_FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    MAINNET_UNI_ROUTER01: "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a",
    MAINNET_UNI_ROUTER02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    RINKEBY_UNI_FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    RINKEBY_UNI_ROUTER02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    UNI_FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    UNI_ROUTER02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
};

const LIBRARIES = {
    OPTION_TEMPLATE_LIB:
        "contracts/option/libraries/OptionTemplateLib.sol:OptionTemplateLib",
    REDEEM_TEMPLATE_LIB:
        "contracts/option/libraries/RedeemTemplateLib.sol:RedeemTemplateLib",
    TRADER_LIB: "contracts/option/libraries/TraderLib.sol:TraderLib",
};

const CONTRACT_NAMES = {
    REGISTRY: "contracts/option/applications/Registry.sol:Registry",
    TRADER: "contracts/option/extensions/Trader.sol:Trader",

    OPTION_FACTORY:
        "contracts/option/applications/factories/OptionFactory.sol:OptionFactory",
    REDEEM_FACTORY:
        "contracts/option/applications/factories/RedeemFactory.sol:RedeemFactory",
    OPTION: "contracts/option/primitives/Option.sol:Option",
    REDEEM: "contracts/option/primitives/Redeem.sol:Redeem",
    UNISWAP_TRADER:
        "contracts/option/extensions/UniswapConnector03.sol:UniswapConnector03",
    DAI: "contracts/test/tokens/DAI.sol:DAI",
};

module.exports = {
    ERR_CODES,
    PARAMETERS,
    VALUES,
    ADDRESSES,
    LIBRARIES,
    CONTRACT_NAMES,
};
