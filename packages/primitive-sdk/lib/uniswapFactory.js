"use strict";

const { makeEthersBaseClass } = require("@primitivefi/ethers-base");
const UniswapFactoryArtifact = require("@uniswap/v2-core/build/UniswapV2Factory.json");

module.exports = class UniswapFactory extends makeEthersBaseClass(UniswapFactoryArtifact) {};
