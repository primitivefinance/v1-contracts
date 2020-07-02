'use strict';

const { makeEthersBaseClass } = require('@primitive/ethers-base');
const RedeemArtifact = require('@primitive/contracts/artifacts/Redeem');

module.exports = class Redeem extends makeEthersBaseClass(RedeemArtifact) {};
