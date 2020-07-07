"use strict";

const { makeEthersBaseClass } = require("@primitivefi/ethers-base");
const TraderArtifact = require("@primitivefi/contracts/deployments/buidlerevm_31337/Trader");

module.exports = class Trader extends makeEthersBaseClass(TraderArtifact) {};
