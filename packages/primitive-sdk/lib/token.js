"use strict";

const { makeEthersBaseClass } = require("@primitivefi/ethers-base");
const TokenArtifact = require("@primitivefi/contracts/artifacts/ERC20");

module.exports = class Token extends makeEthersBaseClass(TokenArtifact) {};
