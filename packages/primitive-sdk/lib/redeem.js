"use strict";

const { makeEthersBaseClass } = require("@primitivefi/ethers-base");
const RedeemArtifact = require("@primitivefi/contracts/artifacts/Redeem");

module.exports = class Redeem extends makeEthersBaseClass(RedeemArtifact) {};
