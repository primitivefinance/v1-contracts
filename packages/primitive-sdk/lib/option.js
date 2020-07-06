"use strict";

const { makeEthersBaseClass } = require("@primitive/ethers-base");
const OptionArtifact = require("@primitive/contracts/artifacts/Option");

module.exports = class Option extends makeEthersBaseClass(OptionArtifact) {};
