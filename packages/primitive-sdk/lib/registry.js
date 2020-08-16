"use strict";

const { makeEthersBaseClass } = require("@primitivefi/ethers-base");
const RegistryArtifact = require("@primitivefi/contracts/artifacts/Registry");

module.exports = class Registry extends makeEthersBaseClass(RegistryArtifact) {};
