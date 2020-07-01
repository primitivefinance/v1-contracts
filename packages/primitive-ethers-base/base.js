'use strict';

const { uniqBy, keyBy, mapValues, once } = require('lodash');
const ethers = require('ethers');
const { Web3Provider } = ethers.providers;
const { BigNumber, bigNumberify, formatUnits, getAddress } = require('ethers/utils');
const axios = require('axios');

const moment = require('moment');

const ZERO_ADDRESS = '0x' + Array(40).fill('0').join('');

const EthersContract = Object.getPrototypeOf(new ethers.Contract(ZERO_ADDRESS, [], new ethers.getDefaultProvider()));

const wrapLog = (log, contract) => Object.assign(log, {
  getBlock: async () => await contract.provider.getBlock(log.blockHash),
  getTransaction: async () => await contract.provider.getTransaction(log.transactionHash),
  getTransactionReceipt: async () => await contract.provider.getTransactionReceipt(log.transactionHash)
});

class EthersBaseClass {
  constructor() {}
  async getEvents(filterOpts = {}) {
    const iface = this.constructor.interface;
    filterOpts.fromBlock = filterOpts.fromBlock || '0x0';
    const address = this.contract.address.length === 66 ? '0x' + this.contract.address.substr(26) : this.contract.address;
    let filter = Object.assign({
      toBlock: 'latest'
    }, filterOpts);
    const logs = (await this.contract.provider.getLogs(filter)).map((v) => wrapLog(Object.assign(v, {
      parsed: iface.parseLog(v)
    }), this.contract));
    return logs;
  }
}

Object.setPrototypeOf(EthersBaseClass.prototype, EthersContract);

const toSigner = (providerOrSigner) => {
  try {
    return providerOrSigner.getSigner();
  } catch (e) {
    return providerOrSigner;
  }
};

const defer = () => {
  let promise, resolve, reject;
  promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    promise,
    resolve,
    reject
  };
};

const makeEthersBaseClass = (artifact) => {
  const abi = uniqBy(artifact.abi, 'name');
  const contract = new ethers.Contract(ZERO_ADDRESS, abi, new ethers.providers.InfuraProvider('kovan'));
  const EthersContract = Object.getPrototypeOf(contract);
  const baseClass = class PrimitiveEthersBaseClass extends EthersBaseClass {
    static async deploy(provider, ...args) {
      const factory = new ethers.ContractFactory(abi, artifact.bytecode, provider)
      return await factory.deploy(...args);
    }
    constructor(address, providerOrSigner) {
      super();
      address = address.length === 66 ? '0x' + address.substr(26) : address;
      this.contract = contract.attach(address).connect(toSigner(providerOrSigner));
      this.address = address;
      this.provider = this.contract.provider;
    }
    connect(providerOrSigner) {
      this.contract = contract.attach(this.address).connect(providerOrSigner.asEthers ? providerOrSigner.asEthers() : providerOrSigner);
      this.provider = this.contract.provider;
      return this;
    }
    async getGasPrice({
      multiplier
    }) {
      try {
        const result = (await axios({
          method: 'GET',
          url: 'https://ethgasstation.info/json/ethgasAPI.json'
        })).data.fast;
        return ethers.utils.hexlify(ethers.utils.parseUnits(String(Math.floor((Number(result)*Number(multiplier)))), 8));
      } catch (e) {
        console.error(e);
        return null;
      }
    }
    async addGasPrice(args) {
      const gasPrice = await this.getGasPrice({
        multiplier: 1.25
      });
      if (gasPrice) {
        const last = (typeof args[args.length - 1] === 'object' && Object.getPrototypeOf(args[args.length - 1]) === Object.prototype) ? args[args.length - 1] : (() => { const last = {}; args.push(last); return last; })();
        if (!last.gasPrice) last.gasPrice = gasPrice;
      }
      return args;
    }
  };
  const managerSubclass = class extends baseClass {};
  const keyed = keyBy(abi, 'name');
  Object.keys(contract.functions).forEach((v) => {
    managerSubclass.prototype[v] = async function (...args) {
      const deferred = defer();
      deferred.resolve = once(deferred.resolve);
      deferred.reject = once(deferred.reject);
      const isCall = keyed[v].constant || ['view', 'pure'].includes(keyed[v].stateMutability);
      const mappedArgs = isCall ? args : await this.addGasPrice(args);
      const innerContract = isCall ? contract.attach(this.address).connect(this.contract.provider.asEthers ? this.contract.provider.asEthers() : this.provider) : contract.attach(this.address).connect(toSigner(this.contract.provider));
      const tx = await innerContract[v](...mappedArgs);
      if (isCall) return tx;
      const provider = this.provider;
      const simpleWait = tx.wait.bind(tx);
      const listener = async (block) => {
        while (true) {
          block = await provider.send('eth_getBlockByNumber', [ '0x' + Number(block).toString(16), true ]);
          if (block) break;
          await new Promise((resolve, reject) => setTimeout(resolve, 2000));
        }
        const actualTx = block.transactions.find((v) => v.from === tx.from && nonce === tx.nonce);
        if (actualTx) {
          const receipt = await provider.send('eth_getTransactionReceipt', [ actualTx.hash ])
          receipt.logs = receipt.logs.map((v) => {
            try {
              Object.assign(v, this.constructor.interface.parseLog(v));
            } catch (e) {}
            return v;
          });
          deferred.resolve(receipt);
        }
      };
      const stopListening = () => provider.removeListener('block', listener);
      tx.forceWait = () => {
        const simpleWaitPromise = simpleWait();
        provider.on('block', listener)
        simpleWaitPromise.then(deferred.resolve).catch(deferred.reject);
        return deferred.promise.then((v) => { stopListening(); return v; }).catch((err) => { stopListening(); throw err; });
      };
      return tx;
    };
  });
  managerSubclass.prototype._events = contract._events;
  return copyStatics(managerSubclass, Object.assign({}, contract, {
    abi: abi,
    networks: artifact.networks
  }));
};

const copyStatics = (target, from) => {
  target.interface = from.interface;
  target.functions = from.functions;
  target.networks = from.networks;
  target.abi = from.abi;
  return target;
};

const copyStaticsFromArtifact = (target, artifact) => {
  const interfaceObject = new ethers.utils.Interface(uniqBy(artifact.abi, 'name'));
  const functions = interfaceObject.functions;
  return Object.assign(target, {
    functions,
    interface: interfaceObject,
    networks: artifact.networks,
    abi: artifact.abi
  });
};

const makeMainnetInstanceGetterFactory = (artifact) => {
  const baseClass = class extends makeEthersBaseClass(artifact) {};
  baseClass.getMainnetInstance = function (provider) {
    provider = provider || new ethers.providers.InfuraProvider('mainnet');
    if (!artifact.networks[1]) throw Error('no mainnet address associated with factory for ' + artifact.contractName);
    return new this(artifact.networks[1].address, provider);
  }
  return baseClass;
}

Object.assign(module.exports, {
  makeEthersBaseClass,
  makeMainnetInstanceGetterFactory
});
