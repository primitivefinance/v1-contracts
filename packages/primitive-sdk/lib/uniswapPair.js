"use strict";

const { makeEthersBaseClass } = require("@primitivefi/ethers-base");
const UniswapPairArtifact = require("@uniswap/v2-core/build/UniswapV2Pair.json");

module.exports = class UniswapPair extends makeEthersBaseClass(UniswapPairArtifact) {};
