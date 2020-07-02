'use strict';

const assembleCloneCode = require('./assemble-clone-code');
const ethers = require('ethers');
const Redeem = require('@primitive/contracts/artifacts/Redeem');

const REDEEM_SALT = ethers.utils.solidityKeccak256(['string'], ['primitive-redeem']);
const REDEEM_INITCODEHASH = ethers.utils.solidityKeccak256(['bytes'], [ Redeem.bytecode ]);

const computeRedeemAddress = ({
  factoryRedeem,
  registry,
  tokenP,
  underlying
}) => {
  const implementation = ethers.utils.getCreate2Address({
    from: factoryRedeem,
    salt: ethers.utils.arrayify(REDEEM_SALT),
    initCodeHash: ethers.utils.arrayify(REDEEM_INITCODEHASH)
  });
  return ethers.utils.getCreate2Address({
    from: factoryRedeem,
    salt: ethers.utils.arrayify(ethers.utils.solidityKeccak256([
      'bytes32',
      'address',
      'address',
      'address'
    ], [
      REDEEM_SALT,
      registry,
      tokenP,
      underlying
    ])),  
    initCodeHash: ethers.utils.arrayify(ethers.utils.solidityKeccak256([ 'bytes' ], [ assembleCloneCode(factoryRedeem, implementation) ]))
  });
};

module.exports = computeRedeemAddress;
