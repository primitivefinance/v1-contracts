"use strict";

const { makeEthersBaseClass } = require("@primitivefi/ethers-base");
const FactoryArtifact = require("@primitivefi/contracts/artifacts/Factory");

module.exports = class Factory extends makeEthersBaseClass(FactoryArtifact) {};
