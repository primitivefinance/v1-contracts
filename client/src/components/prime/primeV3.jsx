import React, { Component, PureComponent } from 'react';
import { Web3ReactProvider, getWeb3ReactContext } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import Button from '@material-ui/core/Button';
import GitHubIcon from '@material-ui/icons/GitHub';
import TwitterIcon from '@material-ui/icons/Twitter';
import LinearIndeterminate from './linearIndeterminate';
import IconButton from '@material-ui/core/IconButton';
import DetailsIcon from '@material-ui/icons/Details';
import Tooltip from '@material-ui/core/Tooltip';
import FunctionsIcon from '@material-ui/icons/Functions';
import HomeIcon from '@material-ui/icons/Home';
import ViewListIcon from '@material-ui/icons/ViewList';
import CheckIcon from '@material-ui/icons/Check';

import Web3 from 'web3';
import TOKENS_CONTEXT from './tokenAddresses';
import PrimeContract from '../../artifacts/Prime.json';
import INITIAL_OPTIONS from './intialOptions';
import Erc20 from '../../artifacts/tUSD.json';
import Exchange from '../../artifacts/Exchange.json';
import Options from '../../artifacts/Options.json';

import TradingViewWidget, { Themes } from 'react-tradingview-widget';
import Web3Modal from 'web3modal';

import Header from './header';
import OptionsChainTableV3 from './optionsChainTableV3';
import PositionsTableV2 from './positionsTableV2';
import OpenPosition from './openPosition';
import Fortmatic from "fortmatic";


const providerOptions = {
    fortmatic: {
        package: Fortmatic, // required
        options: {
          key: "FORTMATIC_KEY" // required
        }
      }
};

function ellipseAddress(address) {
    let width = 4;
    let newAddress = `${address.slice(0, width)}...${address.slice(-width)}`;
    return newAddress;
};

function initWeb3(provider) {
    const web3 = new Web3(provider);
  
    web3.eth.extend({
      methods: [
        {
          name: "chainId",
          call: "eth_chainId",
          outputFormatter: web3.utils.hexToNumber
        }
      ]
    });
  
    return web3;
};

const styles = theme => ({
    root: {
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
        justifyContent: 'center',
        /* alignItems: 'center', */
        flexDirection: 'row', /* CHANGED THIS TO ROW FOR THE SIDE PANEL */
        backgroundColor: colors.background,
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        },
    },

    sideColumn: {
        display: 'flex',
        width: '5%',
        flexDirection: 'column',
        backgroundColor: colors.sidePanel,
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
        color: colors.primary,
    },

    chainContainer: {
        display: 'flex',
        minWidth: '30%',
        minHeight: '30%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
        margin: '16px',
        backgroundColor: colors.banner,
    },
    chainHeader: {
        display: 'flex',
        height: '10vh',
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        textAlign: 'center',
        color: colors.primary,
        /* borderTop: '0px',
        borderRight: '0px',
        borderLeft: '0px',
        borderStyle: 'solid',
        borderBottomWidth: '0.1px',
        borderColor: colors.primary, */
        backgroundColor: colors.headerBanner,
    },
    chainHeaderTypography1: {
        width: '25%',
        alignItems: 'center',
        textAlign: 'center',
        fontWeight: '700',
    },
    chainHeaderTypography2: {
        width: '50%',
        alignItems: 'center',
        textAlign: 'center',
        fontWeight: '700',
    },
    chainHeaderTypography3: {
        width:'25%',
        alignItems: 'center',
        textAlign: 'center',
        fontWeight: '700',
    },
    
    chainBody: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexDirection: 'row',
        margin: '16px',
        borderRadius: '16px',
    },
    chainButton: {
        backgroundColor: colors.secondary,
        color: colors.banner,
        borderRadius: '4px',
        margin: '16px',
        '&:hover': {
            backgroundColor: colors.success,
        },
    },
    chainFooter: {

    },
    navButton: {
        backgroundColor: colors.secondary,
        color: colors.banner,
        borderRadius: '32px',
        marginTop: '16px',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        '&:hover': {
            backgroundColor: colors.primary,
            boxShadow: '0 0px 16px rgba(255, 255, 255, .4)',
        },
    },
    connectButton: {
        backgroundColor: colors.secondary,
        color: colors.banner,
        borderRadius: '32px',
        /* marginTop: '16px', */
        margin: '8px',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        '&:hover': {
            backgroundColor: colors.primary,
            boxShadow: '0 0px 16px rgba(255, 255, 255, .4)',
        },
    },
    header: {
        display: 'flex',
        height: '10%',
    },

    body: {
        display: 'flex',
        flexDirection: 'row',
        minHeight: '90%',
        minHeight: '90vh',
        /* width: '100%', */
        margin: '8px',
    },

    openPosition: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.banner,
        width: '15%',
        margin: '8px',
    },

    core: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.background,
        width: '85%',
        /* minHeight: '100vh', */
        margin: '8px',
    },

    coreHeader: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        backgroundColor: colors.bannerTitle ,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
    },

    coreHeaderTypography: {
        width: '33.33%',
        textAlign: 'center',
    },

    chart: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.banner,
        marginBottom: '8px',
        padding: '4px',
        minHeight: '50vh',
    },

    chain: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.banner,
        height: '100%',
        marginTop: '8px',
        
    },

    positions: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.banner,
        /* minHeight: '40%', */
        marginTop: '8px',
        height: '100%',
    },

    interface: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.banner,
        /* minHeight: '40%', */
        marginTop: '8px',
        height: '100%',
    },

    interfaceButton: {
        backgroundColor: colors.secondary,
        color: colors.banner,
        borderRadius: '32px',
        marginTop: '16px',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        '&:hover': {
            backgroundColor: colors.primary,
            boxShadow: '0 0px 16px rgba(255, 255, 255, .4)',
        },
    },

    rowButtonL: {
        backgroundColor: colors.banner,
        color: colors.primary,
        '&:hover' : {
            backgroundColor: colors.banner,
            color: colors.primary,
            boxShadow: '0 0px 1px rgba(255, 255, 255, .4)',
        },
        fontWeight: '600',
        width: '25%',
        borderRadius: '4px',
        margin:'4px',
        /* borderStyle: 'solid',
        borderColor: colors.primaryButton,
        borderWidth: '2px',
        borderInlineWidth: 'medium',
        borderEndWidth: 'medium', */
    },
    
    
    rowButtonS: {
        backgroundColor: colors.banner,
        color: colors.purple,
        '&:hover' : {
            backgroundColor: colors.banner,
            color: colors.purple,
            boxShadow: '0 0px 1px rgba(255, 255, 255, .4)',
        },
        width: '25%',
        borderRadius: '4px',
        margin:'4px',
        fontWeight: '600',
        /* borderStyle: 'solid',
        borderColor: colors.primaryButton,
        borderWidth: '2px',
        borderInlineWidth: 'medium',
        borderEndWidth: 'medium', */
    },

    rowContainer2: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: colors.banner,
        borderRadius: '4px',
        width: '50%',
        justifyContent: 'center',
    },

    coreHeaderInterface: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        backgroundColor: colors.banner ,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
    },

    footer: {
        display: 'flex',
        flexDirection: 'column',
        margin: '16px',
    },
    selectButton: {
        backgroundColor: colors.secondary,
        color: colors.banner,
        borderRadius: '32px',
        margin: '8px',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        '&:hover': {
            backgroundColor: colors.banner,
            boxShadow: '0 0px 16px rgba(255, 255, 255, .4)',
            color: colors.primary,
        },
        borderStyle: 'solid',
        borderColor: colors.primary,
        borderWidth: '1px',
    },
    selectedButton: {
        backgroundColor: colors.banner,
        color: colors.primary,
        borderRadius: '32px',
        margin: '8px',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        '&:hover': {
            backgroundColor: colors.primary,
            boxShadow: '0 0px 16px rgba(255, 255, 255, .4)',
            color: colors.banner,
        },
        borderStyle: 'solid',
        borderColor: colors.primary,
        borderWidth: '1px',
    },
    selectChain: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.background,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectChainContainer: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: colors.background,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    selectProduct: {
        display: 'flex',
        flexDirecton: 'column',
        color: colors.primary,
        '&:hover' : {
            backgroundColor: colors.headerBanner
        },
        borderRadius: '0px',
        width: '100%',
        height: '10vh',
    },

    selectProductFill: {
        display: 'flex',
        flexDirecton: 'column',
        color: colors.primary,
        borderRadius: '0px',
        width: '100%',
        height: '70%',
        cursor: 'select',
        borderBlockEndStyle: 'solid',
        borderColor: colors.primary,
    },

    homeButton: {
        color: colors.primary,
        borderRadius: '0px',
        width: '100%',
        height: '10vh',
        borderBlockEndStyle: 'solid',
        borderColor: colors.primary,
    },

});


class PrimeV3 extends Component {
    constructor(props) {
        super(props);
        this.state = {...INITIAL_OPTIONS};
        this.web3Modal = new Web3Modal({
            network: 'rinkeby',
            cacheProvider: true,
            providerOptions
        });

        /* CORE */
        this.getAccount = this.getAccount.bind(this);
        this.getNetwork = this.getNetwork.bind(this);
        this.resetApp = this.resetApp.bind(this);
        
        /* HELPER WEB3 FUNCTIONS */
        this.handleApprove = this.handleApprove.bind(this);
        this.handleAllowance = this.handleAllowance.bind(this);
        this.getInstance = this.getInstance.bind(this);
        this.getTokenAbi = this.getTokenAbi.bind(this);
        this.getTokenAddress = this.getTokenAddress.bind(this);
        this.getContractInstance = this.getContractInstance.bind(this);

        /* CONTRACT INTERACTION */
        this.handleMint = this.handleMint.bind(this);
        this.createPrime = this.createPrime.bind(this);
        this.primeExercise = this.primeExercise.bind(this);
        this.primeClose = this.primeClose.bind(this);

        /* GET DATA */
        this.getOwnerOfPrime = this.getOwnerOfPrime.bind(this);
        this.getPrimeProperties = this.getPrimeProperties.bind(this);
        this.getPastEvents = this.getPastEvents.bind(this);
        this.getPrimeInventory = this.getPrimeInventory.bind(this);
        this.getWalletData = this.getWalletData.bind(this);
        this.getProfitData = this.getProfitData.bind(this);
        this.getBankData = this.getBankData.bind(this);
        this.getBankInventory = this.getBankInventory.bind(this);
        this.getMintedPrimes = this.getMintedPrimes.bind(this);
        this.getDeactivatedPrimes = this.getDeactivatedPrimes.bind(this);
        this.getActivePrimes = this.getActivePrimes.bind(this);

        this.onConnect = this.onConnect.bind(this);
        this.getPositions = this.getPositions.bind(this);
        this.getUsdToEth = this.getUsdToEth.bind(this);
        this.handleOptionSelect = this.handleOptionSelect.bind(this);
        this.handleOrder = this.handleOrder.bind(this);

        this.getOptions = this.getOptions.bind(this);
        this.unlockPair = this.unlockPair.bind(this);
        this.mintTestTokens = this.mintTestTokens.bind(this);
        this.handleSelectChain = this.handleSelectChain.bind(this);
        this.getContractConstant = this.getContractConstant.bind(this);
        this.callContractFunction = this.callContractFunction.bind(this);
        this.getPendingTx = this.getPendingTx.bind(this);

        this.createOptionsChain = this.createOptionsChain.bind(this);
        this.getOptionsV2 = this.getOptionsV2.bind(this);
    }

    componentDidMount = async () => {
        if (this.web3Modal.cachedProvider) {
            this.onConnect();
        };
    };

    /* WEB3 FUNCTIONS */

    resetApp = async () => {
        const { web3 } = this.state;
        console.log(web3.currentProvider)
        if (web3 && web3.currentProvider && web3.currentProvider.close) {
          await web3.currentProvider.close();
          console.log('web3 on reset', web3)
        }
        await this.web3Modal.clearCachedProvider();
        console.log('RESET APP')
        this.setState( INITIAL_OPTIONS );
    };

    onConnect = async () => {
        const provider = await this.web3Modal.connect();

        const web3 = initWeb3(provider);

        const accounts = await web3.eth.getAccounts();

        const address = accounts[0];

        const networkId = await web3.eth.net.getId();

        const chainId = await web3.eth.getChainId();
        await this.setState({
            web3: web3,
            provider: provider,
            connected: true,
            address: address,
            chainId: chainId,
            networkId: networkId,
            account: address,
        });
        /* 
        await this.getPastEvents('PrimeMinted');
        await this.getPrimeInventory();
        await this.getWalletInventory();
        await this.getBankInventory();
        await this.getProfitData();
        await this.getActivePrimes(); 
        await this.getPositions(); */
        /* await this.getOptionsV2(2); */
        await this.getPositions();
        console.log({web3, provider, address,  chainId, networkId})
    };

    getAccount = async () => {
        console.time('getAccount');
        const web3 = this.state.web3;
        if(web3) {
            let accounts = await web3.eth.getAccounts();
            let account = accounts[0];
            this.setState({
                account: account,
            })
            return(account);
        }
        console.timeEnd('getAccount');
    };

    getNetwork = async () => {
        console.time('getNetwork');
        const web3 = this.state.web3;
        if(web3) {
            let networkId = await web3.eth.net.getId();
            /* console.trace({networkId}) */
            console.timeEnd('getTokenAddress');
            return(networkId);
        }
        console.timeEnd('getNetwork');
    };

    getContractInstance = async (Contract) => {
        let contractName = Contract.contractName;
        if(
            this.state.instances
            && this.state.instances[contractName]
        ) {
            let _instance = this.state.instances[contractName][0]['instance']
            console.timeEnd('getContractInstance');
            return _instance;
        };


        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();

        // GET CONTRACT
        const deployedNetwork = await Contract.networks[networkId];
        const instance = new web3.eth.Contract(
            Contract.abi,
            deployedNetwork && deployedNetwork.address,
        );

        let instanceArray = (this.state.instances) ? Array.from(this.state.instances) : [];
        let newArray = [
            {
                instance: instance,
                address: deployedNetwork.address
            }
        ]
        instanceArray.push(newArray);
        this.setState({
            instances: {
                ...this.state.instances,
                [contractName]: newArray,
            }
        });
        return instance;
    };

    getAllowance = async (symbol) => {
        let instance = await this.getInstance(symbol);
        let prime = await this.getContractInstance(PrimeContract);
        const account = await this.getAccount();
        let allowance = await instance.methods.allowance(
            account,
            prime._address
        ).call();
        this.setState({
            allowances: {
                ...this.state.allowances,
                [symbol]: [allowance],
            },
        });
        return allowance;
    };

    getTokenAddress = (networkId, symbol) => {
        console.time('getTokenAddress');
        let token = TOKENS_CONTEXT[networkId][symbol];
        if(typeof token !== 'undefined' && typeof token.address !== 'undefined') {
            /* console.trace(token.address) */
            console.timeEnd('getTokenAddress');
            return token.address;
        } else {
            /* console.trace(token.address) */
            console.timeEnd('getTokenAddress');
            return '';
        }
    };

    getTokenAbi = (networkId, symbol) => {
        console.time('getTokenAbi');
        let token = TOKENS_CONTEXT[networkId][symbol];
        if(typeof token !== 'undefined' && typeof token.address !== 'undefined') {
            /* console.trace(token.address) */
            console.timeEnd('getTokenAbi');
            return token.abi;
        } else {
            /* console.trace(token.address) */
            console.timeEnd('getTokenAbi');
            return '';
        }
    };

    getInstance = async (symbol) => {
        console.time('getContractInstance');
        if(
            this.state.instances
            && this.state.instances[symbol]
        ) {
            let _instance = this.state.instances[symbol][0]['instance']
            console.timeEnd('getContractInstance');
            return _instance;
        };


        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();

        // GET CONTRACT
        const deployedNetwork = networkId;
        let address = await this.getTokenAddress(networkId, symbol);
        let abi = await this.getTokenAbi(networkId, symbol);
        const instance = new web3.eth.Contract(
            abi,
            deployedNetwork && address,
        );

        const name = await instance.methods.name().call();

        /* console.trace({instance}) */
        let instanceArray = (this.state.instances) ? Array.from(this.state.instances) : [];
        let newArray = [
            {
                name: name,
                instance: instance,
                address: deployedNetwork.address
            }
        ]
        instanceArray.push(newArray);
        this.setState({
            instances: {
                ...this.state.instances,
                [symbol]: newArray,
            }
        });
        console.timeEnd('getContractInstance');
        return instance;
    };

    handleApprove = async (contractInstance, approveAddr, approveAmt, _from) => {
        console.time('handleApprove');
        let approve = await contractInstance.methods.approve(
                approveAddr,
                approveAmt
            ).send({
                from: _from,
        });
        console.timeEnd('handleApprove');
        return approve;
    };

    handleAllowance = async (symbol) => {
        console.log('HANDLE ALLOWANCE FOR: ', symbol)
        const web3 = this.state.web3;
        const account = await this.getAccount();
        let instance = await this.getInstance(symbol);
        let prime = await this.getContractInstance(PrimeContract);
        let primeAddress = prime._address;
        let allowance = await web3.utils.toWei('1000000000');
        let approve = await instance.methods.approve(
            primeAddress,
            allowance
        ).send({
            from: account,
        });

        this.setState({
            allowances: {
                ...this.state.allowances,
                [symbol]: allowance,
            },
        });
        return approve;
    };

    createPrime = async (
        collateralAsset, 
        paymentAsset, 
        addressReceiver, 
        expirationDate,
        collateralAmount,
        paymentAmount
    ) => {
        if(
            isNaN(collateralAmount)
            || isNaN(paymentAmount)
        ) {
            return;
        }


        // GET WEB3 AND ACCOUNT
        const web3 = this.state.web3;

        /* console.trace({web3}) */
        const account = await this.getAccount();

        // GET NETWORK ID
        const networkId = await this.getNetwork();

        // GET PRIME CONTRACT
        let primeInstance = await this.getContractInstance(PrimeContract);
        let collateralInstance = await this.getInstance(collateralAsset);

        /* collateralAmount = (await web3.utils.toWei(collateralAmount)).toString();
        paymentAmount = (await web3.utils.toWei(paymentAmount)).toString(); */
        // CALL PRIME METHOD
        let result;
        if(typeof primeInstance !== 'undefined') {
            let nonce = await primeInstance.methods.nonce().call();
            let DEFAULT_AMOUNT_WEI = await web3.utils.toWei((1).toString());
            /* 
            * TOKENS_CONTEXT is a constant that can search for addresses of assets
            * TOKENS_CONTEXT[NETWORKID][TOKEN_SYMBOL].address
            */

            let collateralAllowance = await this.getAllowance(collateralAsset);
            if(collateralAllowance < collateralAmount) {
                let approveAmt = await web3.utils.toWei('10000000');
                console.log('UNLOCKING COLLATERAL ASSET', {collateralAsset})
                await this.getPendingTx(true, 1, 1);
                try {
                    await this.handleApprove(collateralInstance, primeInstance._address, approveAmt, account);
                    await this.getPendingTx(false);
                } catch (error) {
                    await this.getPendingTx(false);
                }
            }

            const _xis = collateralAmount;
            const _yak = this.getTokenAddress(networkId, collateralAsset);
            const _zed = paymentAmount;
            const _wax = this.getTokenAddress(networkId, paymentAsset);
            const _pow = expirationDate;
            const _gem = addressReceiver;

            /*
            * @dev From the Prime.sol contract
            * @param _xis Amount of collateral to deposit.
            * @param _yak Address of collateral asset.
            * @param _zed Amount of payment asset.
            * @param _wax Payment asset address.
            * @param _pow Expiry timestamp.
            * @param _gem Receiver address.
            * @return bool Success.
            */
            result = await primeInstance.methods.createPrime(
                _xis,
                _yak,
                _zed,
                _wax,
                _pow,
                _gem,
            ).send({
                from: account,
            });

            this.setState({
                /* createPrimeTx: result, */
                onDashboard: true,
            }, (async () => {
                        await this.getPositions();
                    }
                )
                
            );
            console.trace({result});
        }

        
        console.timeEnd('createPrime');
        return result;
    };

    /* COMPONENT FUNCTIONS */

    getWalletData = async (instance, account) => {
        const web3 = this.state.web3;
        let _prime = await this.getContractInstance(PrimeContract);
        function createData(symbol, balance) {
            return { symbol, balance };
        };
        let sym = await instance.methods.symbol().call();
        let bal = await web3.utils.fromWei(await instance.methods.balanceOf(account).call()); /* BAL OF WALLET */
        /* let bal;
        bal = await web3.utils.fromWei(await _prime.methods.getBalance(account, instance._address).call()); */
        
        let data = createData(sym, bal);
        return data;
    };

    getWalletInventory = async () => {
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();

        function createData(symbol, balance) {
            return { symbol, balance };
        };


        // GET CONTRACTS

        const daiAbi = this.getTokenAbi(networkId, 'DAI')
        const daiAddress = this.getTokenAddress(networkId, 'DAI')
        const daiNetwork = '4';
        const daiInstance = new web3.eth.Contract(
            daiAbi,
            daiNetwork && daiAddress,
        );

        const tUSDAbi = this.getTokenAbi(networkId, 'tUSD')
        const tUSDAddress = this.getTokenAddress(networkId, 'tUSD')
        const tUSDNetwork = '4';
        const tUSDInstance = new web3.eth.Contract(
            tUSDAbi,
            tUSDNetwork && tUSDAddress,
        );

        const tETHAbi = this.getTokenAbi(networkId, 'tETH')
        const tETHAddress = this.getTokenAddress(networkId, 'tETH')
        const tETHNetwork = '4';
        const tETHInstance = new web3.eth.Contract(
            tETHAbi,
            tETHNetwork && tETHAddress,
        );

        let ethBal = await web3.utils.fromWei(await web3.eth.getBalance(account));
        let ethSym = 'ETH'
        let ethData = createData(ethSym, ethBal);
        let walletRows = [];
        walletRows.push(ethData);
        walletRows.push(await this.getWalletData(daiInstance, account));
        walletRows.push(await this.getWalletData(tUSDInstance, account));
        walletRows.push(await this.getWalletData(tETHInstance, account));
        console.log({walletRows})

        this.setState({
            walletRows: walletRows,
        },);

        return walletRows;
    };

    getBankData = async (instance, account) => {
        const web3 = this.state.web3;
        let _prime = await this.getContractInstance(PrimeContract);
        function createData(symbol, balance) {
            return { symbol, balance };
        };
        let sym = await instance.methods.symbol().call();
        let bal;
        bal = await web3.utils.fromWei(await _prime.methods.getBalance(account, instance._address).call());
        
        let data = createData(sym, bal);
        return data;
    };

    getBankInventory = async () => {
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();

        // GET CONTRACTS

        const daiAbi = this.getTokenAbi(networkId, 'DAI')
        const daiAddress = this.getTokenAddress(networkId, 'DAI')
        const daiNetwork = '4';
        const daiInstance = new web3.eth.Contract(
            daiAbi,
            daiNetwork && daiAddress,
        );

        const tUSDAbi = this.getTokenAbi(networkId, 'tUSD')
        const tUSDAddress = this.getTokenAddress(networkId, 'tUSD')
        const tUSDNetwork = '4';
        const tUSDInstance = new web3.eth.Contract(
            tUSDAbi,
            tUSDNetwork && tUSDAddress,
        );

        const tETHAbi = this.getTokenAbi(networkId, 'tETH')
        const tETHAddress = this.getTokenAddress(networkId, 'tETH')
        const tETHNetwork = '4';
        const tETHInstance = new web3.eth.Contract(
            tETHAbi,
            tETHNetwork && tETHAddress,
        );

        let bankRows = [];
        bankRows.push(await this.getBankData(daiInstance, account));
        bankRows.push(await this.getBankData(tUSDInstance, account));
        bankRows.push(await this.getBankData(tETHInstance, account));
        console.log({bankRows})

        this.setState({
            bankRows: bankRows,
        },);

        return bankRows;
    };

    primeExercise = async (tokenId) => {
        // GETS KEY PARAMS
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();
        let primeInstance = await this.getContractInstance(PrimeContract);

        // GETS PRIME PROPERTIES
        let properties = await this.getPrimeProperties(tokenId);

        // GETS PAYMENT CONTRACT INTERFACE
        let paymentInstance = new web3.eth.Contract(
            Erc20.abi,
            networkId && properties['wax'],
        );

        // APPROVES PRIME TO GET PAYMENT FROM OWNER
        let approvePayment = await this.handleApprove(
            paymentInstance, 
            primeInstance._address,
            (await web3.utils.toWei(properties['zed'])),
            account
        );

        // EXERCISES PRIME TOKEN
        let exercise = await primeInstance.methods.exercise(
            tokenId
        ).send({
            from: account
        });

        // SENDS COLLATERAL TO PAYMENT RECEIVER
        let withdraw = await primeInstance.methods.withdraw(
            properties['xis'],
            properties['yak']
        ).send({
            from: account
        });

        // GETS THE NEW INVENTORY STATE
        console.log('PRIME EXERCISE', {exercise})
        await this.getPrimeInventory();
        return exercise;
    };

    primeClose = async (tokenId) => {
        // GETS KEY PARAMS
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();
        let primeInstance = await this.getContractInstance(PrimeContract);

        // GETS PRIME PROPERTIES
        let properties = await this.getPrimeProperties(tokenId);

        // Close PRIME TOKEN
        let close = await primeInstance.methods.close(
            tokenId,
            tokenId
        ).send({
            from: account
        });

        // GETS THE NEW INVENTORY STATE
        console.log('PRIME CLOSE', {close})
        await this.getPrimeInventory();
        return close;
    };

    getMintedPrimes = async () => {
        // GETS KEY PARAMS
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();
        let primeInstance = await this.getContractInstance(PrimeContract);

        let mintedPrimes = (await primeInstance.methods.getActor(account).call()).mintedTokens;
        this.setState({
            mintedPrimes: mintedPrimes,
        });
        return mintedPrimes;
    };

    getDeactivatedPrimes = async () => {
        // GETS KEY PARAMS
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();
        let primeInstance = await this.getContractInstance(PrimeContract);

        let deactivatedPrimes = (await primeInstance.methods.getActor(account).call()).deactivatedTokens;
        this.setState({
            deactivatedPrimes: deactivatedPrimes,
        });
        return deactivatedPrimes;
    };


    handleMint = async (symbol) => {
        console.log('MINT: ', symbol)
        console.time('handleMint');

        if(symbol === 'U' || symbol === 'S' || symbol === 'ETH') {
            console.log('SYMBOL DOESNT HAVE MINT FUNCTION', symbol)
            return;
        };

        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();


        /* GET CONTRACTS */
        let address = this.getTokenAddress(networkId, symbol);
        let abi = this.getTokenAbi(networkId, symbol);
        const instance = new web3.eth.Contract(
            abi,
            networkId && address,
        );

        let amount = await web3.utils.toWei((100).toString());
        let mint = await instance.methods.mint(
            account,
            amount,
        ).send({
            from: account,
        });

        console.log({mint})
        await this.getWalletInventory();
        console.timeEnd('handleMint');
    };

    getProfitData = async () => {
        /* 
        * GETS DATA FOR GRAPH INFO 
        * NEED TO GET ALL PRIME DATA
        * ETH/USD RATE
        * CONVERT TOKENS TO THEIR USD VALUE
        * COMPARE USD VALUES
        * RETURN DATA OBJECT
        */

        /* KEY VARIABLES */
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();
        let data = (this.state.data) ? this.state.data 
            : {
            labels: [],
            datasets: [
              {
                label: 'Net Profit in USD $',
                fill: false,
                lineTension: 0.1,
                backgroundColor: 'rgba(75,192,192,0.4)',
                borderColor: 'rgba(75,192,192,1)',
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: 'rgba(75,192,192,1)',
                pointBackgroundColor: '#fff',
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: 'rgba(75,192,192,1)',
                pointHoverBorderColor: 'rgba(220,220,220,1)',
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: []
              }
            ]
          };
        console.log({data})
        let collateralAmt;
        let collateralSym;
        let paymentAmt;
        let paymentSym;
        let cRatio;
        let pRatio;
        let cValue;
        let pValue;
        let netValue;
        let tokenId;
        let usdToEth;
        let totalCollateralValue = 0;
        let totalPaymentValue = 0;
        let totalNetValue = 0;
        let highestNetValue = 0;
        let highestTokenId;
        let statsArray = [];

        /* USD TO ETH PRICE */
        const cUsdEthAbi = this.getTokenAbi(networkId, 'CHAIN-USDETH')
        const cUsdEthAddress = this.getTokenAddress(networkId, 'CHAIN-USDETH')
        const cUsdEthNetwork = networkId;
        const cUsdEthInstance = new web3.eth.Contract(
            cUsdEthAbi,
            cUsdEthNetwork && cUsdEthAddress,
        );

        let price;
        try {
            price = await cUsdEthInstance.methods.latestAnswer().call({from: account});
        } catch (err) {
            console.log({err})
        }

        let timestamp;
        try {
            timestamp = await cUsdEthInstance.methods.latestTimestamp().call({from: account});
        } catch (err) {
            console.log({err})
        }
        
        usdToEth = price / 10**8;
        console.log({usdToEth, timestamp})

        let primeRows = (this.state.primeRows) ? this.state.primeRows : [];
        console.log({primeRows}, 'GET PROFIT DATA')

        const labels = data['labels'];
        console.log({labels})
        const newLabel = Array.from(labels)

        const dataArray = data['datasets'][0]['data'];
        console.log({dataArray})
        const addedData = Array.from(dataArray)

        let tokenValues = {};

        for(var i = 0; i < primeRows.length; i++) {
            collateralAmt = primeRows[i].xis;
            paymentAmt = primeRows[i].zed;
            collateralSym = primeRows[i].yakSymbol;
            paymentSym = primeRows[i].waxSymbol;
            tokenId = primeRows[i].tokenId;
            console.log({tokenId})
            switch(collateralSym) {
                case 'DAI':
                    cRatio = 1;
                    break;
                case 'U':
                    cRatio = usdToEth;
                    break;
                case 'S':
                    cRatio = 1;
                    break;
                case 'tUSD':
                    cRatio = 1;
                    break;
                case 'tETH':
                    cRatio = usdToEth;
                    break;    
            };

            switch(paymentSym) {
                case 'DAI':
                    pRatio = 1;
                    break;
                case 'U':
                    pRatio = usdToEth;
                    break;
                case 'S':
                    pRatio = 1;
                    break;
                case 'tUSD':
                    pRatio = 1;
                    break;
                case 'tETH':
                    pRatio = usdToEth;
                    break;  
            };

            cValue = collateralAmt * cRatio;
            pValue = paymentAmt * pRatio;
            console.log({cValue, pValue})
            const valueData = {
                [collateralSym]: {
                    cValue: cValue,
                },
                [paymentSym]: {
                    pValue: pValue,
                },
                ['tokenId']: {
                    tokenId: tokenId,
                },
            };

            netValue = (cValue - pValue);
            newLabel.push(tokenId);
            addedData.push((netValue).toFixed(2))
            console.log({newLabel, addedData, netValue})

            totalCollateralValue = totalCollateralValue + cValue;
            totalPaymentValue = totalPaymentValue + pValue;
            totalNetValue = totalNetValue + netValue;
            console.log({totalNetValue})
            if(netValue > highestNetValue) {
                highestNetValue = netValue;
                highestTokenId = tokenId;
            };

            tokenValues[tokenId] = {
                nV: (netValue).toFixed(2),
                pV: (pValue).toFixed(2),
                cV: (cValue).toFixed(2),
            };
            
        };
        
        const newData = {
            ...data,
            labels: newLabel,
            datasets: [{
                ...data['datasets'][0],
                data: addedData,
            }],
        };

        const newStatsData = {
            tCV: (totalCollateralValue).toFixed(2),
            tPV: (totalPaymentValue).toFixed(2),
            tNV: (totalNetValue).toFixed(2),
            hNV: (highestNetValue).toFixed(2),
            hID: highestTokenId,
            tokenValues: tokenValues,

        }

        
        this.setState({
            data: newData,
            statsData: newStatsData,
        },)
    };

    getUsdToEth = async () => {
        const networkId = await this.getNetwork();
        const web3 = this.state.web3;
        const account = this.state.account;
        /* USD TO ETH PRICE */
        const cUsdEthAbi = this.getTokenAbi(networkId, 'CHAIN-USDETH')
        const cUsdEthAddress = this.getTokenAddress(networkId, 'CHAIN-USDETH')
        const cUsdEthNetwork = networkId;
        const cUsdEthInstance = new web3.eth.Contract(
            cUsdEthAbi,
            cUsdEthNetwork && cUsdEthAddress,
        );

        let price;
        try {
            price = await cUsdEthInstance.methods.latestAnswer().call({from: account});
        } catch (err) {
            console.log({err})
        }

        let timestamp;
        try {
            timestamp = await cUsdEthInstance.methods.latestTimestamp().call({from: account});
        } catch (err) {
            console.log({err})
        }
        
        let usdToEth = price / 10**8;
        return usdToEth;
    }

    getContractConstant = async (constant, instance, ...args) => {
        console.time('getContractConstant')
        const web3 = this.state.web3;
        const account = this.state.account;
        const networkId = this.state.networkId;
        let val = await instance.methods[constant](...args).call();
        /* console.log({constant, instance, val}) */
        console.timeEnd('getContractConstant')
        return val;
    };

    getPendingTx = (isPending, ...args) => {
        if(!isPending) {
            this.setState({
                pendingTx: false,
                txNumber: undefined,
                txAmount: undefined,
            });
        }

        this.setState({
            pendingTx: isPending,
            txNumber: args[0],
            txAmount: args[1],
        });
        return isPending;
    }

    callContractFunction = async (instance, func, from, value, ...args) => {
        const web3 = this.state.web3;
        const account = this.state.account;
        const networkId = this.state.networkId;
        
        let result = await instance.methods[func](...args).send({from: from, value: value})
        console.log({result})
        return result;
    };

    /* OPTION CHAIN */

    getExchangePositions = async () => {
        const web3 = this.state.web3;
        const account = this.state.account;
        const networkId = this.state.networkId;
        const primeInstance = await this.getContractInstance(PrimeContract);
        const deployedNetwork = await Exchange.networks[this.state.networkId];
        const exchangeInstance = new web3.eth.Contract(
            Exchange.abi,
            deployedNetwork && deployedNetwork.address,
        );

        let nonce = await primeInstance.methods.nonce().call();

        function createData(tokenId, xis, yakSymbol, zed, waxSymbol, pow, gem, position) {
            return { tokenId, xis, yakSymbol, zed, waxSymbol, pow, gem, position };
        };

        let primeRows = [];
        let activePrimes = await this.getActivePrimes();
        let userOwnedPrimes = [];
        let position = {};

        for(var i = 0; i < activePrimes.length; i++) {
            let properties = await this.getPrimeProperties(activePrimes[i]);
            let yakInstance = new web3.eth.Contract(
                Erc20.abi,
                networkId && properties['yak'],
            );
            let yakSymbol = await yakInstance.methods.symbol().call();

            let waxInstance = new web3.eth.Contract(
                Erc20.abi,
                networkId && properties['wax'],
            );
            let waxSymbol = await waxInstance.methods.symbol().call();

            let tokenId = activePrimes[i];
            let xis = await web3.utils.fromWei(properties['xis']);
            let zed = await web3.utils.fromWei(properties['zed']);
            /* const date = new Date(properties['pow'] * 1000);
            let pow = (date.toDateString()); */
            let pow = properties['pow'];
            let data = createData(
                tokenId,
                xis,
                yakSymbol,
                zed,
                waxSymbol,
                pow,
                properties['gem'],
                position[`${tokenId}`]
            );

            primeRows.push(data)
            console.log({primeRows})
        }
        this.setState({
            primeRows: primeRows,
        },);
        return primeRows;
    };

    /* POSITION */
    getPastEvents = async (instance, event) => {
        // GET PRIME CONTRACT
        const account = this.state.account;
        let result = await instance.getPastEvents(event, {
            /* filter: {_tokenId: tokenId}, */
            fromBlock: 0,
            toBlock: 'latest',
        });
        let returnValues = [];
        for(var i = 0; i < result.length; i++){
            returnValues.push(result[i].returnValues);
        }
        this.setState({
            pastEvents: {
                [event]: result,
            },
            returnValues: {
                [event]: returnValues,
            },
        });
        return returnValues;
    };

    getActivePrimes = async () => {
        let minted = await this.getMintedPrimes();
        let inactive = await this.getDeactivatedPrimes();
        /* let ownedPrimes = await this.getPrimeInventory(); */

        let activePrimes = minted.filter(val => !inactive.includes(val));
        /* activePrimes = ownedPrimes.filter(val => !activePrimes.includes(val)); */
        console.log({activePrimes})
        this.setState({
            activePrimes: activePrimes
        });
        return activePrimes;
    };

    getOwnerOfPrime = async (tokenId) => {
        console.time('getOwnerOfPrime')
        const web3 = this.state.web3;
        const account = this.state.account;
        let result;

        if(this.state.ownerOf[tokenId]) {
            console.timeEnd('getOwnerOfPrime');
            return this.state.ownerOf[tokenId];
        } else {
            const primeInstance = await this.getContractInstance(PrimeContract);
            result = await this.getContractConstant(
                'ownerOf', primeInstance,
                tokenId
            );
            this.setState({
                ownerOf: {
                    [tokenId]: result,
                }
            });
        }
        console.timeEnd('getOwnerOfPrime');
        return result;
    };

    getPrimeProperties = async (tokenId) => {
        console.time('getPrimeProperties')
        const web3 = this.state.web3;
        const account = this.state.account;
        let result;

        if(this.state.primeTokens[tokenId]) {
            console.timeEnd('getPrimeProperties');
            return this.state.primeTokens[tokenId];
        } else {
            const primeInstance = await this.getContractInstance(PrimeContract);
            result = await this.getContractConstant(
                'getPrime', primeInstance,
                tokenId
            );
            this.setState({
                primeTokens: {
                    [tokenId]: result
                }
            });
        }
        console.timeEnd('getPrimeProperties');
        return result;
    };

    getPrimeInventory = async () => {
        const web3 = this.state.web3;
        const account = this.state.account;
        const networkId = this.state.networkId;
        const primeInstance = await this.getContractInstance(PrimeContract);
        const exchangeInstance = await this.getContractInstance(Exchange);

        let nonce = await primeInstance.methods.nonce().call();

        function createData(tokenId, xis, yakSymbol, zed, waxSymbol, pow, gem, position) {
            return { tokenId, xis, yakSymbol, zed, waxSymbol, pow, gem, position };
        };

        /* 
            NEED TO GET ALL THE TOKENS THE USER IS EFFECTIVELY IN CONTROL OF
            ACTIVE PRIMES ARE ALL MINTED PRIMES
            DEACTIVE PRIMES ARE ALL DESTROYED PRIMES
            DOES NOT INCLUDE PRIMES PURCHASED FROM EXCHANGE OR OTHERS
            OWNEROF WOULD CHECK IF THEY OWN THE PRIME

            COULD CHECK EVENT HISTORY FOR PURCHASES?
            AS THE AMNOUNT OF TOKENS GOES UP, ITS UNFEASIBLE TO CHECK
            EVERY SINGLE TOKENS OWNER AND COMPARE...

            COULD CHECK BUY ORDERS AND THEN CHECK OWNERSHIP...
            IT WOULDNT SHOW PRIMES FROM 3RD PARTIES. COULD ADD 
            AN IMPORT FUNCTION TO HANDLE THAT..

        */

        let primeRows = [];
        let activePrimes = await this.getActivePrimes(); /* UNION OF MINTED AND ! DEACTIVATED PRIME */
        let userOwnedPrimes = [];
        let position = {};
        let userTokens = [];

        /* GET LONG POSITIONS BY CHECKING BUY ORDER EVENTS */
        let buyOrders = await this.getPastEvents(exchangeInstance, 'BuyOrder');
        for(var i = 0; i < buyOrders.length; i++) {
            let tokenId = buyOrders[i]._tokenId;
            let owner = await this.getOwnerOfPrime(tokenId);
            if(owner === account) {
                userOwnedPrimes.push(tokenId)
            }
        }

        let buyOrdersUnfilled = await this.getPastEvents(exchangeInstance, 'FillOrderUnfilled');
        for(var i = 0; i < buyOrdersUnfilled.length; i++) {
            let tokenId = buyOrdersUnfilled[i]._tokenId;
            let owner = await this.getOwnerOfPrime(tokenId);
            if(owner === account) {
                userOwnedPrimes.push(tokenId)
            }
        }

        /* STORE THE LONG POSITION TOKENS */
        for(var i = 0; i < userOwnedPrimes.length; i++) {
            position[userOwnedPrimes[i]] = true;
        };

        /* ADD SHORT AND LONG POSITIONS TO USERTOKENS ARRAY */
        for(var i = 0; i < activePrimes.length; i++) {
            userTokens.push(activePrimes[i]);
            /* console.log('pushing active prime to user token', activePrimes[i]) */
        }

        for(var i = 0; i < userOwnedPrimes.length; i++) {
            userTokens.push(userOwnedPrimes[i]);
            /* console.log('pushing user owned prime to user token', userOwnedPrimes[i]) */
        }

        /* FILTER DUPLICATES OUT */
        userTokens = [...new Set(userTokens)];
 
        /* CHECK USERTOKENS AGAINST CURRENT STATE OF PRIME ROWS */
        let update = false;
        if(this.state.primeRows) {
            for(var i = 0; i < (this.state.primeRows).length; i++) {
                if(userTokens.indexOf(this.state.primeRows[i].tokenId) == -1) {
                    update = true;
                }
            }
        }

        /* CREATE DATA OBJECT FOR EACH TOKENID */
        if(typeof this.state.primeRows === 'undefined' || update) {
            for(var i = 0; i < userTokens.length; i++) {
                let properties = await this.getPrimeProperties(userTokens[i]);
                let yakInstance = new web3.eth.Contract(
                    Erc20.abi,
                    networkId && properties['yak'],
                );
                let yakSymbol = await this.getContractConstant(
                    'symbol', yakInstance
                );
    
                let waxInstance = new web3.eth.Contract(
                    Erc20.abi,
                    networkId && properties['wax'],
                );
                
                let waxSymbol = await this.getContractConstant(
                    'symbol', waxInstance
                );
    
                let tokenId = userTokens[i];
                let xis = await web3.utils.fromWei(properties['xis']);
                let zed = await web3.utils.fromWei(properties['zed']);
                let pow = properties['pow'];
                let data = createData(
                    tokenId,
                    xis,
                    yakSymbol,
                    zed,
                    waxSymbol,
                    pow,
                    properties['gem'],
                    position[`${tokenId}`]
                );
    
                primeRows.push(data)
            }
    
            this.setState({
                primeRows: primeRows
            });
        } else {
            primeRows = this.state.primeRows
        }
        
        return primeRows;
    };

    getPositions = async () => {
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();
        let primeInstance = await this.getContractInstance(PrimeContract);
        const deployedNetwork = await Exchange.networks[this.state.networkId];
        const exchangeInstance = new web3.eth.Contract(
            Exchange.abi,
            deployedNetwork && deployedNetwork.address,
        );

        let tokenId, isLong, name, netProfit, costBasis, premium, expiration;
        let cValue, pValue;
        function createData(tokenId, isLong, name, netProfit, costBasis, premium, expiration) {
            return { tokenId, isLong, name, netProfit, costBasis, premium, expiration };
        };


        let primeRows = await this.getPrimeInventory();
        let positionRows = [];
        let usdEthRatio = await this.getUsdToEth();

        for(var i = 0; i < primeRows.length; i++) {
            
            let row = primeRows[i];
            let ratio;
            switch(row.yakSymbol) {
                case 'tETH':
                    ratio = usdEthRatio;
                    break;
                case 'tUSD':
                    ratio = 1;
                    break;
                case 'DAI':
                    ratio = 1;
                    break;
            }
            cValue = ratio * row.xis;

            switch(row.waxSymbol) {
                case 'tETH':
                    ratio = usdEthRatio;
                    break;
                case 'tUSD':
                    ratio = 1;
                    break;
                case 'DAI':
                    ratio = 1;
                    break;
            }

            
            pValue = ratio * row.zed;
            tokenId = row.tokenId;
            isLong = row.position;
            name = `${row.xis} ${row.yakSymbol} / ${row.zed} ${row.waxSymbol}`;
            if(isLong) {
                netProfit = cValue - pValue;
            } else {
                netProfit = pValue - cValue;
            }

            if(isLong) {
                costBasis = '1';
            } else {
                costBasis = '0';
            }
            
            premium = '20';

            if(premium > 0) {
                netProfit = 
                (isLong)
                ? (premium - costBasis) ? (`+ ${(premium - costBasis)}`) : (`${(premium - costBasis)}`)
                    : (premium - costBasis) ? (`${(premium - costBasis)}`) : (`+ ${(premium - costBasis)}`);
            } else {
                netProfit = 0;
            }
            

            const date = new Date(row.pow * 1000);
            let pow = (date.toDateString());
            expiration = pow;



            let data = createData(
                tokenId, 
                isLong, 
                name, 
                netProfit, 
                costBasis, 
                premium, 
                expiration
            );

            positionRows.push(data)

            /* CHECK FOR DUPLICATES AND INCREMENT QTY */
            /* for(var i = 0; i < positionRows.length; i++) {
                const match = positionRows.filter(
                    row => {
                        return (
                            data.isLong === row.isLong 
                            && data.expiration === row.expiration
                            && data.name === row.name
                        );
                    }
                );
            } */
            
        }
        console.log({positionRows})
        this.setState({
            positionRows: positionRows,
            loadingPositions: false,
        },);
    };


    /* 
     * FLOW:
     * USER SELECTS OPTION PAIR
     * USER SELECTS EXPIRATION DATE
     * GET OPTIONS FUNCTION GETS INITIAL OPTION DATA
     * AND RETURNS THE OPTIONS AND THEIR MATCHING TOKENS
     * USER SELECTS OPTION
     * IF THERE IS A MATCHING TOKEN ID, IT WILL POPULATE
     * ORDER FORM WITH ITS PROPERTIES
     * IF NO MATCHING TOKEN, IT WILL CREATE A MOCK TOKEN
     * AND POPULATE THE ORDER FORM WITH THE MOCK PROPERTIES
     * THIS.STATE.OPTIONSELECT RETURNS THE SELECTED OPTION
     * PROPERTIES.
     * USER THEN SUBMITS ORDER WITH POPULATED VALUES
     * 
     * KEY STATE VALUES
     * call/put Column CONTAINS ALL INFO FOR OPTION CHAIN
     * optionSelection CONTAINS INFO FOR SELECTED OPTION
    */

    getOptions = async (hash) => {
        console.log(`Getting Options chain for ${hash}`)

        const web3 = this.state.web3;
        let primeInstance = await this.getContractInstance (PrimeContract);
        const exchangeInstance = await this.getContractInstance(Exchange);

        let nonce = await primeInstance.methods.nonce().call();
        console.log({nonce})
        for(var i = 1; i <= nonce; i++) {
            let _chain = await primeInstance.methods.getChain(i).call();
            console.log({i, _chain})
        }
        const networkId = this.state.networkId;
        const context = TOKENS_CONTEXT[networkId];

        let minAsks = {
            'call': {},
            'put': {},
        };

        function compareNumbers(a, b) {
            return a - b;
        }

        let callOptions = (this.state.optionV2[hash]) ? this.state.optionV2[hash]['call'] : [];
        let callMatches = await compareOptionsArray(callOptions);
        let callOrders = await getOrders(callMatches);
        let expiration = '1600473585';

        for(var i = 0; i < callOptions.length; i++) {
            let callAsks = [];
            let orders = callOrders['sell'];
            let matches = callMatches[i];
            /* FOR EACH OBJECT, GET THE ASK */
            for(var x = 0; x < matches.length; x++) {
                let objAsk = orders[matches[x]];
                callAsks.push(objAsk);
            }
            
            let min = (callAsks.sort(compareNumbers))[0];
            minAsks['call'][i] = min;
        }


        console.log({minAsks})
        let callColumn = {
            'chain': hash,
            'expiration': expiration,
            'options': callOptions,
            'matches': callMatches,
            'orders': callOrders,
            'minAsks': minAsks['call'],

        };

        let putOptions = (this.state.optionV2[hash]) ? this.state.optionV2[hash]['put'] : [];
        let putMatches = await compareOptionsArray(putOptions);
        let putOrders = await getOrders(putMatches);

        for(var i = 0; i < putOptions.length; i++) {
            let putAsks = [];
            let orders = putOrders['sell'];
            let matches = putMatches[i];
            /* FOR EACH OBJECT, GET THE ASK */
            for(var x = 0; x < matches.length; x++) {
                let objAsk = orders[matches[x]];
                putAsks.push(objAsk);
            }
            
            let min = (putAsks.sort(compareNumbers))[0];
            minAsks['put'][i] = min;
        }

        let putColumn = {
            'chain': hash,
            'expiration': expiration,
            'options': putOptions,
            'matches': putMatches,
            'orders': putOrders,
            'minAsks': minAsks['put'],
        };

        
        /* COMPARE AN INTIAL STATE OPTION WITH A REAL TOKEN */
        async function compareOptionsArray(array) {
            let arrayMatches = {};
            for(var i = 0; i < array.length; i++) {
                let option = array[i];
                let cAddress = context[option.collateralUnits].address;
                let sAddress = context[option.strikeUnits].address;
                let cAmt = option.collateral;
                let sAmt = option.strike;
                let matches = [];
            
                matches = await getMatches(cAmt, sAmt);
    
                /* COMBINE ALL MATCHING TOKEN IDS WITH THE CALLOPTION AT i */
                arrayMatches[i] = matches;
            }

            return arrayMatches;
        };

        /* COMPARE PROPERTIES WITH ALL TOKENS */
        async function getMatches(cAmt, sAmt) {
            let matches = [];
            /* FOR EACH TOKEN IN THE NONCE, COMPARE and PUSH TOKENIDs MATCHING */
            for(var x = 1; x <= nonce; x++) {
                let chain = await primeInstance.methods.getChain(x).call();
                let prime = await primeInstance.methods.getPrime(x).call();
                
                if(chain === hash) {
                    let xis = await web3.utils.fromWei(prime['xis']);
                    if((xis != cAmt)) {
                        continue;
                    }
                
                    let zed = await web3.utils.fromWei(prime['zed']);
                
                    if(
                        xis === cAmt
                        && zed === sAmt
                    ) {
                        matches.push(x)
                    }
                }

            }
            return matches;
        };

        /* FOR EACH MATCH, GET BID/ASK */
        async function getOrders(obj) {
            let len = Object.keys(obj).length;
            let orders = {
                'sell': {},
                'buy': {},
            };
            console.trace({len})
            for(var i = 0; i < len; i++) {
                for(var x = 0; x < obj[i].length; x++ ) {
                    console.log('in orders second loop', obj[i])
                    let buyOrder = await exchangeInstance.methods.getBuyOrder(obj[i][x]).call();
                    if(buyOrder.tokenId > 0) {
                        console.log('MATCHED BUY ORDER', buyOrder.tokenId)
                        let bidPrice = buyOrder.bidPrice;
                        orders['buy'][obj[i][x]] = bidPrice;
                    }

                    let sellOrder = await exchangeInstance.methods.getSellOrder(obj[i][x]).call();
                    console.log({sellOrder}, obj[i][x])
                    if(sellOrder.tokenId > 0) {
                        console.log('MATCHED SELL ORDER', sellOrder.tokenId, sellOrder.askPrice)
                        let askPrice = sellOrder.askPrice;
                        orders['sell'][obj[i][x]] = askPrice;
                    }
                }
            }
            console.log('getting orders', )
            return orders;
        };

        let askTest = await exchangeInstance.methods.getSellOrder('30').call();
        console.log({callOrders, putOrders, callColumn, putColumn, askTest})

        /* UPDATE STATE WITH THE INITIAL OPTIONS AND THE MATCHING MINTED TOKENS */
        this.setState({
            putColumn: putColumn,
            callColumn: callColumn,
            loadingChain: false,
        });

        await this.getPositions();
    
    };


    /* 
        DATA FLOW
        SELECT EXPIRATION & PAIR
        GET OPTIONS
        GET POSITIONS
        PASS OPTIONS TO OPTIONSTABLE
        OPTIONTABLE HAS SELECT OPTION FUNCTION
        OPTION PASSED TO SELECT OPTION
        SELECTED OPTION PASSED TO OPEN ORDER COMPONENT
        OPEN ORDER COMPONENT HAS FUNCTION TO SUBMIT ORDER
        ORDER IS SUBMITTED
    
    */
    getOptionsV2 = async (id) => {
        console.log(`Getting Options chain for ${id}`)

        const web3 = this.state.web3;
        const account = this.state.account;
        const networkId = this.state.networkId;
        let primeInstance = await this.getContractInstance (PrimeContract);
        let exchangeInstance = await this.getContractInstance(Exchange);
        const optionsInstance = await this.getContractInstance(Options);

        let optionsChainObj = await optionsInstance.methods.getOptionChain(id).call();
        let baseRatio, chain, collateral, expiration, strike, increment;
        baseRatio = optionsChainObj.baseRatio;
        chain = optionsChainObj.chain;
        collateral = optionsChainObj.collateral;
        expiration = optionsChainObj.expiration;
        strike = optionsChainObj.strike;
        increment = optionsChainObj.increment;

        let collateralInstance = new web3.eth.Contract(
            Erc20.abi,
            networkId && collateral,
        );

        let strikeInstance = new web3.eth.Contract(
            Erc20.abi,
            networkId && strike,
        );
        let collateralSym = await collateralInstance.methods.symbol().call();
        let strikeSym = await strikeInstance.methods.symbol().call();
        
        let collateralAmt = '1';
        let amountRows = '20';

        let strikeAmt = (baseRatio * 1 - increment * 3).toString();
        let callRows = [];
        for(var i = 0; i < amountRows; i++) {
            let index = i;
            console.log({strikeAmt, index})
            let item = {
                index: index,
                collateral: collateral,
                collateralAmt: collateralAmt,
                collateralSym: collateralSym,
                strike: strike,
                strikeAmt: strikeAmt,
                strikeSym: strikeSym,
                expiration: expiration,
                chain: chain,
            }
            /* INCREMENT BASE RATIO BY INCREMENT */
            strikeAmt = (strikeAmt * 1 + 10).toString();
            callRows.push(item);
        } 
        console.log({callRows})

        /* RESET TO BASE RATIO */
        strikeAmt = (baseRatio * 1 - increment * 3).toString();
        let putRows = [];
        for(var i = 0; i < amountRows; i++) {
            let index = i;
            let item = {
                index: index,
                collateral: strike,
                collateralAmt: strikeAmt,
                collateralSym: strikeSym,
                strike: collateral,
                strikeAmt: collateralAmt,
                strikeSym: collateralSym,
                expiration: expiration,
                chain: chain,
            }
            /* INCREMENT BASE RATIO BY INCREMENT */
            strikeAmt = (strikeAmt * 1 + 10).toString();
            putRows.push(item);
        } 
        console.log({putRows})


        let option = {
            [chain]: {
                'call': callRows,
                'put': putRows,
            }
        }

        let nonce = await primeInstance.methods.nonce().call();
        console.log({nonce})
        const deployedNetwork = await Exchange.networks[networkId];
        exchangeInstance = new web3.eth.Contract(
            Exchange.abi,
            networkId && deployedNetwork.address,
        );
        for(var i = 1; i <= nonce; i++) {
            let _chain = await primeInstance.methods.getChain(i).call();
            let sellOrder = await exchangeInstance.methods.getSellOrder(i).call();
            console.log({i, _chain, sellOrder})
        }
        const context = TOKENS_CONTEXT[networkId];

        let minAsks = {
            'call': {},
            'put': {},
        };

        function compareNumbers(a, b) {
            return a - b;
        }

        let callOptions = option[chain]['call'];
        let callMatches = await compareOptionsArray(callOptions);
        let callOrders = await getOrders(callMatches);
        /* let expiration = '1600473585'; */

        for(var i = 0; i < callOptions.length; i++) {
            let callAsks = [];
            let orders = callOrders['sell'];
            let matches = callMatches[i];
            /* FOR EACH OBJECT, GET THE ASK */
            for(var x = 0; x < matches.length; x++) {
                let objAsk = orders[matches[x]];
                callAsks.push(objAsk);
            }
            
            let min = (callAsks.sort(compareNumbers))[0];
            minAsks['call'][i] = min;
        }


        console.log({minAsks})
        let callColumn = {
            'chain': chain,
            'expiration': expiration,
            'options': callOptions,
            'matches': callMatches,
            'orders': callOrders,
            'minAsks': minAsks['call'],

        };

        let putOptions = option[chain]['put'];
        let putMatches = await compareOptionsArray(putOptions);
        let putOrders = await getOrders(putMatches);

        for(var i = 0; i < putOptions.length; i++) {
            let putAsks = [];
            let orders = putOrders['sell'];
            let matches = putMatches[i];
            /* FOR EACH OBJECT, GET THE ASK */
            for(var x = 0; x < matches.length; x++) {
                let objAsk = orders[matches[x]];
                putAsks.push(objAsk);
            }
            
            let min = (putAsks.sort(compareNumbers))[0];
            minAsks['put'][i] = min;
        }

        let putColumn = {
            'chain': chain,
            'expiration': expiration,
            'options': putOptions,
            'matches': putMatches,
            'orders': putOrders,
            'minAsks': minAsks['put'],
        };

        
        /* COMPARE AN INTIAL STATE OPTION WITH A REAL TOKEN */
        async function compareOptionsArray(array) {
            let arrayMatches = {};
            for(var i = 0; i < array.length; i++) {
                let option = array[i];
                let cAmt = option.collateralAmt;
                let sAmt = option.strikeAmt;
                let matches = [];
            
                matches = await getMatches(cAmt, sAmt);
    
                /* COMBINE ALL MATCHING TOKEN IDS WITH THE CALLOPTION AT i */
                arrayMatches[i] = matches;
            }

            return arrayMatches;
        };

        /* COMPARE PROPERTIES WITH ALL TOKENS */
        async function getMatches(cAmt, sAmt) {
            let matches = [];
            /* FOR EACH TOKEN IN THE NONCE, COMPARE and PUSH TOKENIDs MATCHING */
            for(var x = 1; x <= nonce; x++) {
                let primeChain = await primeInstance.methods.getChain(x).call();
                let prime = await primeInstance.methods.getPrime(x).call();
                
                if(primeChain === chain) {
                    let xis = await web3.utils.fromWei(prime['xis']);
                    if((xis != cAmt)) {
                        continue;
                    }
                
                    let zed = await web3.utils.fromWei(prime['zed']);
                
                    if(
                        xis === cAmt
                        && zed === sAmt
                    ) {
                        matches.push(x)
                    }
                }

            }
            return matches;
        };

        /* FOR EACH MATCH, GET BID/ASK */
        async function getOrders(obj) {
            let len = Object.keys(obj).length;
            let orders = {
                'sell': {},
                'buy': {},
            };
            console.trace({len})
            for(var i = 0; i < len; i++) {
                for(var x = 0; x < obj[i].length; x++ ) {
                    console.log('in orders second loop', obj[i])
                    let buyOrder = await exchangeInstance.methods.getBuyOrder(obj[i][x]).call();
                    if(buyOrder.tokenId > 0) {
                        console.log('MATCHED BUY ORDER', buyOrder.tokenId)
                        let bidPrice = buyOrder.bidPrice;
                        orders['buy'][obj[i][x]] = bidPrice;
                    }

                    let sellOrder = await exchangeInstance.methods.getSellOrder(obj[i][x]).call();
                    console.log({sellOrder}, obj[i][x])
                    if(sellOrder.tokenId > 0) {
                        console.log('MATCHED SELL ORDER', sellOrder.tokenId, sellOrder.askPrice)
                        let askPrice = sellOrder.askPrice;
                        orders['sell'][obj[i][x]] = askPrice;
                    }
                }
            }
            console.log('getting orders', )
            return orders;
        };

        let askTest = await exchangeInstance.methods.getSellOrder('1').call();
        console.log({callOrders, putOrders, callColumn, putColumn, askTest})

        /* UPDATE STATE WITH THE INITIAL OPTIONS AND THE MATCHING MINTED TOKENS */
        this.setState({
            putColumn: putColumn,
            callColumn: callColumn,
            loadingChain: false,
        });

        await this.getPositions();
    
    };

    handleOptionSelect = async (type, chain, expiration, orders, option, tokenIds,) => {
        /* TYPE IS CALL OR PUT */
        /* IF HAS NO MATCHING TOKEN IDS - NEED TO MOCK A NEW TOKEN TO MINT */
        function mockToken( ace, xis, yak, zed, wax, pow, gem, ) {
            return { ace, xis, yak, zed, wax, pow, gem,}
        }

        const web3 = this.state.web3;
        
        let properties;
        let tokenId = tokenIds[0];

        if(typeof tokenId == 'undefined') {
            let cAmount = await web3.utils.toWei(option.collateralAmt);
            let sAmount = await web3.utils.toWei(option.strikeAmt);
            properties = mockToken(
                this.state.account,
                cAmount,
                '',
                sAmount,
                '',
                expiration,
                this.state.account
            );

        } else {
            properties = await this.getPrimeProperties(tokenId);
        }
        
        this.setState({
            optionSelection: {
                'type': type,
                'chain': chain,
                'expiration': expiration,
                'properties': properties,
                'orders': orders,
                'cAsset': option.collateralSym,
                'sAsset': option.strikeSym,
                'tokenIds': tokenIds,
            }
        });

        console.log({tokenIds});
        console.log(this.state.optionSelection)
    };

    unlockPair = async (symbol1, symbol2) => {
        const web3 = this.state.web3;
        const account = this.state.account;
        const networkId = this.state.networkId;
        const _symbol1 = await this.getInstance(symbol1);
        const _symbol2 = await this.getInstance(symbol2);
        const prime = await this.getContractInstance(PrimeContract);
        const primeAddress = prime._address;
        const amount = await web3.utils.toWei('1000000');

        await _symbol1.methods.approve(
            primeAddress,
            amount
        ).send({from: account});

        await _symbol2.methods.approve(
            primeAddress,
            amount
        ).send({from: account});

        console.log(`You unlocked pair: ${symbol1} / ${symbol2}`);
    };

    mintTestTokens = async (symbol1, symbol2) => {
        const web3 = this.state.web3;
        const account = this.state.account;
        const networkId = this.state.networkId;
        const _symbol1 = await this.getInstance(symbol1);
        const _symbol2 = await this.getInstance(symbol2);
        const amount = await web3.utils.toWei('1000');

        await _symbol1.methods.mint(
            account,
            amount
        ).send({from: account});

        await _symbol2.methods.mint(
            account,
            amount
        ).send({from: account});

        console.log(`You minted 1000 tokens each of pair: ${symbol1} / ${symbol2}`);
    };

    handleOrder = async (
        buyOrder,
        bid,
        buyMultiplier,
        ask,
        sellMultiplier,
        chain,
        expiration,
        collateralAmount, 
        collateralSym, 
        strikeAmount,
        strikeSym, 
    ) => {
        console.log({
            buyOrder,
            bid,
            buyMultiplier,
            ask,
            sellMultiplier,
            chain,
            expiration,
            collateralAmount, 
            collateralSym, 
            strikeAmount, 
            strikeSym, 
        });
        
        /* WEB3 */
        const web3 = this.state.web3;
        const account = this.state.account;
        const networkId = this.state.networkId;
        const exchangeInstance = await this.getContractInstance(Exchange);
        const primeInstance = await this.getContractInstance(PrimeContract)
        const collateralInstance = await this.getInstance(collateralSym);
        const strikeInstance = await this.getInstance(strikeSym);

        /* GET ALLOWANCES FOR ERC-20 TOKENS */
        const collateralAllowance = await this.getContractConstant(
            'allowance', collateralInstance,
            account, primeInstance._address,
        );

        let nonce = await primeInstance.methods.nonce().call();
        let buyOrderResult, sellOrderResult;
        let mintedPrime;

        const option = this.state.optionSelection;
        const tokenIds = option['tokenIds'];
        const sellOrders = option['orders']['sell'];
        const buyOrders = option['orders']['buy'];

        /* 
         * IF, BUY ORDER, 
         *  PLACE A BID,
         * ELSE, ITS A SELL ORDER,
         *  MINT A PRIME AND SELL IT FOR
         *  ASKING PRICE
        */
        if(buyOrder) {
            bid = await web3.utils.toWei((bid).toString());

            /* IF THERES AN OPTION ON MARKET, BUY IT */
            console.log('BUY ORDER TRUE', this.state.optionSelection, tokenIds.length);
            if(tokenIds.length > 0) {

                /* FOR ALL MATCHING TOKENS, CHECK ACTIVE SELL ORDERS ON EXCHANGE */
                for(var i = 0; i < tokenIds.length; i++) {
                    if(typeof sellOrders[tokenIds[i]] !== 'undefined') {
                        console.log('MATCHING TOKEN AVAILABLE FOR PURCHASE', {bid}, 'ask:', sellOrders[tokenIds[i]], tokenIds[i])
                        
                        /* SUBMIT TX */
                        try {

                            await this.getPendingTx(true, 1, 1);
                            let buyOrderResult = await this.callContractFunction(
                                exchangeInstance, 'buyOrder', 
                                account, bid,
                                tokenIds[i], bid
                            );
                            console.log({buyOrderResult})
                            if(buyOrderResult) {
                                await this.getPendingTx(false);
                                return;
                            }

                        } catch (error) {
                            console.log({error})
                            await this.getPendingTx(false)
                        }
                    }
                }
            } 
            
            console.log('NO BUYABLE OPTIONS - PENDING ORDER');
            /* SUBMIT ORDER FUNCTION FOR EXCHANGE */
            await this.getPendingTx(true, 1, 1);
            try { 
                console.log(
                    bid,
                    chain,
                    collateralAmount,
                    collateralInstance._address,
                    strikeAmount,
                    strikeInstance._address,
                    expiration
                );
                let buyUnfilledOrder = await exchangeInstance.methods.buyOrderUnfilled(
                    bid,
                    chain,
                    collateralAmount,
                    collateralInstance._address,
                    strikeAmount,
                    strikeInstance._address,
                    expiration
                ).send({from: account, value: bid})

                /* let buyUnfilledOrder = await this.callContractFunction(
                    exchangeInstance, 'buyOrderUnfilled',
                    account, bid,
                    chain,
                    collateralAmount,
                    collateralInstance._address,
                    strikeAmount,
                    strikeInstance._address,
                    expiration
                ); */
                await this.getPendingTx(false);
            } catch(error) {
                await this.getPendingTx(false);
            }

            
        } else {
            ask = await web3.utils.toWei((ask).toString());

            /* IF YOU OWN A PRIME WITH MATCHING PROPERTIES, SELL IT */

            /* GET ALL OWNED PRIMES */
            let userOwnedPrimes = [];
            for(var i = 1; i <= nonce; i++) {
                if((await this.getOwnerOfPrime(i)) === account) {
                    userOwnedPrimes.push(i);
                } else {
                    console.log('Does not own: ', i)
                }
            };

            /* FOR EACH PRIME COMPARE PROPERTIES */
            let matchingPrimes = [];
            for(var i = 0; i < userOwnedPrimes.length; i++) {
                let tokenId = userOwnedPrimes[i];
                let primeChain = await this.getContractConstant(
                    'getChain', primeInstance,
                    tokenId
                );
                if(primeChain === chain) {
                    let properties = await this.getContractConstant(
                        'getPrime', primeInstance,
                        tokenId
                    );

                    if(
                        collateralAmount === properties.xis
                        && strikeAmount === properties.zed
                    ) {
                        console.log('USER OWNS MATCHING PRIME', {tokenId})
                        matchingPrimes.push(tokenId);
                    }
                }
            }

            if(matchingPrimes.length > 0) {

                let tokenId = matchingPrimes[0];

                /* SELL PRIME TO EXCHANGE FOR ASK PRICE */
                await this.getPendingTx(true, 1, 2);
                try {
                    await this.callContractFunction(
                        primeInstance, 'approve',
                        account, 0,
                        exchangeInstance._address, tokenId
                    );

                    await this.getPendingTx(true, 2, 2);

                    try {
                        await this.callContractFunction(
                            exchangeInstance, 'sellOrder',
                            account, 0,
                            tokenId, ask
                        );
                        await this.getPendingTx(false);

                    } catch (error) {
                        await this.getPendingTx(false);
                    }
                } catch (error) {
                    await this.getPendingTx(false);
                }

                console.log('SELLING OWNED PRIMED', {tokenId, sellOrderResult})
            } else {

                let tokenId;

                /* UNLOCK COLLATERAL ASSET IF LOCKED */
                /* if(collateralAllowance < collateralAmount) {
                    let approveAmt = await web3.utils.toWei('10000000');
                    console.log('UNLOCKING COLLATERAL ASSET', {collateralSym})
                    await this.getPendingTx(true, 1, 1);
                    try {
                        await this.handleApprove(collateralInstance, primeInstance._address, approveAmt, account);
                        await this.getPendingTx(false);
                    } catch (error) {
                        await this.getPendingTx(false);
                    }
                } */

                /* MINT PRIME */
                await this.getPendingTx(true, 1, 3);
                try {
                    mintedPrime = await this.createPrime(
                        collateralSym,
                        strikeSym,
                        this.state.account,
                        expiration,
                        collateralAmount,
                        strikeAmount
                    );

                    tokenId = mintedPrime.events['PrimeMinted'].returnValues['_tokenId'];
    
                    /* SELL PRIME TO EXCHANGE FOR ASK PRICE */
                    await this.getPendingTx(true, 2, 3);
                    try {
                        await this.callContractFunction(
                            primeInstance, 'approve',
                            account, 0,
                            exchangeInstance._address, tokenId
                        );

                        await this.getPendingTx(true, 3, 3);

                        try {
                            sellOrderResult = await this.callContractFunction(
                                exchangeInstance, 'sellOrder',
                                account, 0,
                                tokenId, ask
                            );
                            await this.getPendingTx(false);
                            console.log(sellOrderResult);
                        } catch (error) {
                            await this.getPendingTx(false);
                        }
                    } catch (error) {
                        await this.getPendingTx(false);
                    }
                    
                } catch (error) {
                    await this.getPendingTx(false);
                }

                console.trace({
                    collateralSym,
                    strikeSym,
                    account,
                    expiration,
                    collateralAmount,
                    strikeAmount
                });

                console.log('SELLING NEWLY MINTED PRIME', {tokenId, sellOrderResult})
            }
        }

        await this.getOptionsV2(1);
    };

    handleSelectChain = (selected, isPair) => {
        if(isPair) {
            let symbol = (this.state.optionGlossary[selected]) ? this.state.optionGlossary[selected]['chartSymbol'] : this.state.chartSymbol;
            this.setState({
                selectedPair: selected,
                chartSymbol: symbol,
            });
        } else {
            this.setState({
                selectedExpiration: selected,
            });
        }

        const optionGlossary = this.state.optionGlossary;
        let selectedPair = this.state.selectedPair;
        let selectedExpiration = this.state.selectedExpiration;

        if(selectedPair && !isPair) {
            let option = optionGlossary[selectedPair][selected];
            let symbol = optionGlossary[selectedPair]['chartSymbol'];
            this.setState({
                loadingChain: true,
                chartSymbol: symbol,
            });
            /* this.getOptions(option); */
            this.getOptionsV2(option);
        } else if(selectedExpiration && isPair) {
            let option = optionGlossary[selected][selectedExpiration];
            let symbol = optionGlossary[selected]['chartSymbol'];
            this.setState({
                loadingChain: true,
                chartSymbol: symbol,
            });
            /* this.getOptions(option); */
            this.getOptionsV2(option);
        } else {
            return;
        }

        const date = new Date(selected * 1000);
        selected = date.toDateString();
        console.log(`GOT SELECTED CHAIN FOR ${selectedPair} expiring ${selected}`);
    };

    createOptionsChain = async () => {
        const web3 = this.state.web3;
        const account = this.state.account;
        const networkId = this.state.networkId;
        const optionsInstance = await this.getContractInstance(Options);
        const primeInstance = await this.getContractInstance(PrimeContract);
        console.log('CREATE OPTIONS CHAIN', {optionsInstance, primeInstance})
        let getOptionChain = await optionsInstance.methods.getOptionChain(1).call();
        let getOptionChain2 = await optionsInstance.methods.getOptionChain(2).call();
        console.log({getOptionChain, getOptionChain2})

        let owner = await optionsInstance.methods.owner().call();
        console.log({owner})

        let collateralAsset = 'tETH';
        let strikeAsset = 'DAI';
        let expiration = '1600473585';
        let collateralAmount = await web3.utils.toWei('1');
        let strikeAmount = await web3.utils.toWei('110');
        let baseRatio = (strikeAmount / collateralAmount);
        let increment = '10';

        let collateralInstance = await this.getInstance(collateralAsset);
        // CALL PRIME METHOD
        let result;
        let nonce = await primeInstance.methods.nonce().call();
        let DEFAULT_AMOUNT_WEI = await web3.utils.toWei((1).toString());
        /* 
        * TOKENS_CONTEXT is a constant that can search for addresses of assets
        * TOKENS_CONTEXT[NETWORKID][TOKEN_SYMBOL].address
        */
        let primeAddress = primeInstance._address;
        /* let allowance = await this.getAllowance(collateralAsset);
        if(allowance < collateralAmount) {
            await this.handleApprove(
                collateralInstance, 
                primeAddress, 
                collateralAmount, 
                account
            );
        } */
        
        

        console.log({collateralAsset, strikeAsset, expiration, baseRatio})
        const _xis = collateralAmount;
        const _yak = this.getTokenAddress(networkId, collateralAsset);
        const _zed = strikeAmount;
        const _wax = this.getTokenAddress(networkId, strikeAsset);
        const _pow = expiration;
        const _gem = account;

        /* result = await primeInstance.methods.createPrime(
            _xis,
            _yak,
            _zed,
            _wax,
            _pow,
            _gem,
        ).send({
            from: account,
        });

        let tokenId = result.events['PrimeMinted'].returnValues['_tokenId'];
        let chain = await primeInstance.methods.getChain(tokenId).call(); */

        let optionChain = await optionsInstance.methods.addOptionChain(
            expiration,
            increment,
            _yak,
            _wax,
            baseRatio
        ).send({from: account});
        
        
        console.log({optionChain})

    };

    

    render () {
        const { classes } = this.props;
        
        let optionChainName = 'tETH / DAI';
        let pair = (this.state.selectedPair) ? this.state.selectedPair : '';
        let expiration = this.state.selectedExpiration ? this.state.selectedExpiration : undefined;
        if(expiration) {
            const date = new Date(expiration * 1000);
            expiration = date.toDateString();
        }
        
        return(
            <>
            <div className={classes.root} key='root'>

            {/* FLEX DIRECTION COLUMN - SIDE PANEL */}
            <Box className={classes.sideColumn}>
                <Tooltip title={'Home'}>
                    <IconButton 
                        className={classes.homeButton} 
                        onClick={() => this.setState({ 
                            onOptionsChain: false,
                        })}
                    >
                        <HomeIcon />
                    </IconButton>
                </Tooltip>
                
                <Tooltip title={'Positions'}>
                    <IconButton 
                        className={classes.selectProduct}
                        onClick={() => this.setState({ 
                            onOptionsChain: false,
                        })}
                    >
                        <ViewListIcon />
                    </IconButton>
                </Tooltip>
                

                <Tooltip title={'Derivatives'}>
                    <IconButton 
                        className={classes.selectProduct}
                        onClick={() => this.setState({ 
                            onOptionsChain: true,
                        })}
                    >
                        <FunctionsIcon />
                    </IconButton>
                </Tooltip>

                <Tooltip title={'Primitive'}>
                    <IconButton className={classes.selectProduct} disabled>
                        <DetailsIcon />
                    </IconButton>
                </Tooltip>
                
                <Box className={classes.selectProductFill}>
                </Box>
                
                
                <IconButton className={classes.selectProduct}>
                    <GitHubIcon />
                </IconButton>
                <IconButton className={classes.selectProduct}>
                    <TwitterIcon />
                </IconButton>
                

            </Box>

            <Box style={{display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh',}}>

                <Header
                    className={classes.header}
                    address={(this.state.account) ? this.state.account : ''}
                    chainId={this.state.chainId}
                    classes={classes}
                    account={(this.state.account) ? this.state.account : ''}
                    onConnect={this.onConnect}
                    connected={this.state.connected}
                    resetApp={this.resetApp}
                />

                {/* FLEX DIRECTION IS ROW FOR CONTENTS */}
                <Box className={classes.body} key='body'>

                    {/* LEFT 25% PORTION OF SCREEN - OPEN POSITION*/}
                    <Card className={classes.openPosition} key='open'>

                        {/* <Button 
                            className={classes.navButton} 
                            onClick={() => this.createOptionsChain()}
                        >
                            Create Initial Options Chain
                        </Button> */}

                        <Button 
                            className={classes.navButton} 
                            onClick={() => this.unlockPair('tETH', 'DAI')}
                        >
                            Unlock TETH/DAI Pair
                        </Button>

                        <Button 
                            className={classes.navButton} 
                            onClick={() => this.mintTestTokens('tETH', 'DAI')}
                        >
                            Mint Test Tokens
                        </Button>

                        <OpenPosition
                            optionSelection={this.state.optionSelection}
                            handleOrder={this.handleOrder}
                            pendingTx={this.state.pendingTx}
                            txAmount={this.state.txAmount}
                            txNumber={this.state.txNumber}
                        />

                    </Card>

                    {/* FLEX DIRECTION IS COLUMN - HOLDS CHAIN AND POSITIONS */}
                    <Box className={classes.core} key='core'>
                        
                        {/* CHART */}
                        <Card className={classes.chart} key='chart'>
                            <TradingViewWidget 
                                symbol={this.state.chartSymbol}
                                theme={Themes.DARK} 
                                autosize
                            />
                        </Card>


                        {/* FLEX DIRECTION COLUMN - INTERFACE FOR POSITIONS/DERIVITIVES/PRIMITIVES*/}                       
                        {(this.state.onOptionsChain)
                            ?   
                                <Card className={classes.interface} key='chain'>

                                {/* CORE HEADER - FLEX DIRECTION ROW - SELECT CHAIN*/}
                                <Box className={classes.coreHeaderInterface}>
                                    <Box className={classes.rowContainer2}>
                                    <Button 
                                        className={
                                            (this.state.selectedPair) ? classes.rowButtonS : classes.rowButtonL
                                        } 
                                        onClick={
                                            (this.state.selectedPair) 
                                                ? () => this.setState({ selectedPair: undefined}) 
                                                    : () => this.handleSelectChain('TETHDAI', true)
                                                }
                                    >
                                        TETH/DAI
                                        {(this.state.selectedPair) ? <CheckIcon /> : <CheckIcon style={{color: colors.banner}}/>}
                                    </Button>
                                    <Button 
                                        className={
                                            (this.state.selectedExpiration) ? classes.rowButtonS : classes.rowButtonL
                                        } 
                                        onClick={
                                            (this.state.selectedExpiration) 
                                                ? () => this.setState({ selectedExpiration: undefined}) 
                                                    : () => this.handleSelectChain('1600473585', false)
                                                }
                                    >
                                        Fri Sep 18 
                                        {(this.state.selectedExpiration) ? <CheckIcon /> : <CheckIcon style={{color: colors.banner}}/>}
                                    </Button>
                                    
                                    </Box>
                                </Box>
    
                                
                                <OptionsChainTableV3
                                    title={''}
                                    optionCallRows={this.state.callOptions}
                                    optionPutRows={this.state.putOptions}
                                    callMatches={this.state.callMatches}
                                    putMatches={this.state.putMatches}
                                    callColumn={this.state.callColumn}
                                    putColumn={this.state.putColumn}
                                    handleOptionSelect={this.handleOptionSelect}
                                    pair={this.state.selectedPair}
                                    expiration={this.state.selectedExpiration}
                                />
    
                                {(!this.state.loadingChain) ? <></> : <LinearIndeterminate />}
    
                                </Card>
    
                                :
                                   
                                    <Card className={classes.interface} key='positions'>

                                    <Box className={classes.coreHeaderInterface}>
                                        {/* <Typography className={classes.coreHeaderTypography}>Positions for {ellipseAddress(this.state.account)}</Typography> */}
                                    </Box>

                                    <PositionsTableV2
                                        title={''}
                                        positionRows={this.state.positionRows}
                                        account={ellipseAddress(this.state.account)}
                                    />
                                    {(!this.state.loadingPositions) ? <></> : <LinearIndeterminate />}

                                </Card>
                        }
                        
                    </Box>

                </Box>
                 
            </Box>
            </div>    
            </>
        );
    };

};

export default withStyles(styles)(PrimeV3);