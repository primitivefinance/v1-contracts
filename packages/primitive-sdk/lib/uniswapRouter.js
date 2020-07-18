"use strict";

const { makeEthersBaseClass } = require("@primitivefi/ethers-base");
const UniswapRouterArtifact = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");

module.exports = class UniswapRouter extends makeEthersBaseClass(UniswapRouterArtifact) {};
