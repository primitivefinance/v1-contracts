"use strict";

const { makeEthersBaseClass } = require("@primitive/ethers-base");
const FactoryArtifact = require("@primitive/contracts/artifacts/Factory");

module.exports = class Factory extends makeEthersBaseClass(FactoryArtifact) {};
