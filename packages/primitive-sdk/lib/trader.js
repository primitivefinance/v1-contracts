'use strict';

const { makeEthersBaseClass } = require('@primitive/ethers-base');
const TraderArtifact = require('@primitive/contracts/artifacts/Trader');

module.exports = class Trader extends makeEthersBaseClass(TraderArtifact) {};
