'use strict';

const { uniqBy, keyBy, once } = require('lodash');
const { ContractFactory, Contract } = require('@ethersproject/contracts');
const { Interface } = require('@ethersproject/abi');
const { hexlify } = require('@ethersproject/bytes');
const { getDefaultProvider, JsonRpcProvider, InfuraProvider } = require('@ethersproject/providers');
const { AddressZero } = require('@ethersproject/constants');
const { parseUnits } = require('@ethersproject/units');
const axios = require('axios');

const EthersContract = Object.getPrototypeOf(new Contract(AddressZero, [], new getDefaultProvider()));

const wrapLog = (log, contract) => Object.assign(log, {
  getBlock: async () => await contract.provider.getBlock(log.blockHash),
  getTransaction: async () => await contract.provider.getTransaction(log.transactionHash),
  getTransactionReceipt: async () => await contract.provider.getTransactionReceipt(log.transactionHash)
});

class EthersBase {
  constructor() {}
  async getEvents(filterOpts = {}) {
    const iface = this.constructor.interface;
    if (!filterOpts.fromBlock && this.getGenesis) filterOpts.fromBlock = hexlify(await this.getGenesis());
    else filterOpts.fromBlock = filterOpts.fromBlock || '0x0';
    const address = this.contract.address.length === 66 ? '0x' + this.contract.address.substr(26) : this.contract.address;
    let filter = Object.assign({
      toBlock: 'latest'
    }, filterOpts);
    if (filterOpts.address === null) filter = {
      topics: filter.topics,
      fromBlock: filter.fromBlock,
      toBlock: filter.toBlock
    };
    else if (filterOpts.address === undefined) filter.address = address;
    else filter.address = filterOpts.address;
    const logs = (await this.contract.provider.getLogs(filter)).map((v) => wrapLog(Object.assign(v, {
      parsed: iface.parseLog(v)
    }), this.contract));
    for (const log of logs) {
      // we only need to do this part for markets being made to get the calldata for the details
      if (log.parsed && log.parsed.name === 'FixedProductMarketMakerCreation') {
        log.transaction = await log.getTransaction();
        log.decodedTransaction = iface.parseTransaction(log.transaction);
      } else {
        log.transaction = {};
        log.decodedTransaction = { args: [] };
      }
    }
    return logs;
  }
}

Object.setPrototypeOf(EthersBase.prototype, EthersContract);

const coerceToSigner = (providerOrSigner) => {
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

const toChainId = (network) => {
  if (isNaN(network)) {
    switch (network) {
      case 'mainnet':
        return '1';
      case 'kovan':
        return '42';
      case 'rinkeby':
        return '4';
      default:
        return '1337';
     }
   }
   return network;
};

const tryToGetInfura = (network) => {
  switch (network) {
    case '1':
      return new InfuraProvider('mainnet');
    case '42':
      return new InfuraProvider('kovan');
    case '4':
      return new InfuraProvider('rinkeby');
    default:
      return new JsonRpcProvider('http://localhost:8545');
   }
};

const makeEthersBaseClass = (artifact) => {
  const abi = uniqBy(artifact.abi, 'name');
  const contract = new Contract(AddressZero, abi, new InfuraProvider('kovan'));
  const interfaceObject = new Interface(artifact.abi);
  const EthersContract = Object.getPrototypeOf(contract);
  const managerClass = class DerivedEthersBase extends EthersBase {
    static get interface() { return interfaceObject; }
    static get abi() { return abi; }
    static get functions() { return interfaceObject.functions; }
    static get networks() { return (artifact.networks = artifact.networks || {}); }
    static get(network) {
      const chainId = toChainId(network);
      return new this(((this.networks || {})[chainId] || {}).address || AddressZero, tryToGetInfura(chainId));
    }
    static async deploy(provider, ...args) {
      const factory = new ContractFactory(abi, artifact.bytecode, provider)
      return await factory.deploy(...args);
    }
    constructor(address, providerOrSigner) {
      super();
      address = address.length === 66 ? '0x' + address.substr(26) : address;
      this.contract = contract.attach(address).connect(coerceToSigner(providerOrSigner));
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
        return hexlify(parseUnits(String(Math.floor((Number(result)*Number(multiplier)))), 8));
      } catch (e) {
        console.error(e);
        return null;
      }
    }
    async decorateArgsWithGasPrice(args) {
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
  const managerSubclass = class EthersBaseClass extends managerClass {};
  const keyed = keyBy(abi, 'name');
  Object.keys(contract.functions).forEach((v) => {
    managerSubclass.prototype[v] = async function (...args) {
      const deferred = defer();
      deferred.resolve = once(deferred.resolve);
      deferred.reject = once(deferred.reject);
      const isCall = keyed[v].constant || ['view', 'pure'].includes(keyed[v].stateMutability);
      const mappedArgs = isCall ? args : await this.decorateArgsWithGasPrice(args);
      const innerContract = isCall ? contract.attach(this.address).connect(this.contract.provider.asEthers ? this.contract.provider.asEthers() : this.provider) : contract.attach(this.address).connect(coerceToSigner(this.contract.provider));
      const tx = await innerContract[v](...mappedArgs);
      if (isCall) return tx;
      const provider = this.provider;
      const simpleWait = tx.wait.bind(tx);
      const listener = async (block) => {
        while (true) {
          block = await provider.send('eth_getBlockByNumber', [ '0x' + Number(block).toString(16), true ]);
          if (block) break;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        const actualTx = block.transactions.find((v) => v.from === tx.from && v.nonce === tx.nonce);
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
  return managerSubclass;
};

Object.assign(module.exports, {
  makeEthersBaseClass
});
