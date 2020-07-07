"use strict";

const { makeEthersBaseClass } = require("@primitivefi/ethers-base");
const OptionArtifact = require("@primitivefi/contracts/artifacts/Option");

module.exports = class Option extends makeEthersBaseClass(OptionArtifact) {};
