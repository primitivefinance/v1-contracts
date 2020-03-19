import React, { Component } from 'react';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';

import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Fade from '@material-ui/core/Fade';
import LinkM from '@material-ui/core/Link';

import Web3 from 'web3';
import INITIAL_CONTEXT from './constants';
import TOKENS_CONTEXT from './tokenAddresses';
import PrimeContract from '../../artifacts/Prime.json';
import Erc20 from '../../artifacts/tUSD.json';

import Interface from './interface';
import WalletTable from './walletTable';
import PrimeTable from './primeTable';


const styles = theme => ({
    root: {
        flex: 1,
        display: 'flex',
        width: '100%',
        justifyContent: 'left',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        },
        backgroundColor: colors.background,
    },
    boards: {
        flex: 1,
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        },
    },
    prime: {
        backgroundColor: colors.white,
        '&:hover': {
            backgroundColor: colors.lightblue,
            '& .title': {
                color: colors.blue
            },
            '& .icon': {
                color: colors.blue
            },
        },
        '& .title': {
            color: colors.blue
        },
        '& .icon': {
            color: colors.blue
        },
    },
    title: {
        padding: '24px',
        paddingBottom: '0px',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '24px'
        },
        color: colors.primary,
    },
    transitionButton: {
        //display: 'flex',
        height: '100%',
        width: '5%',
        backgroundColor: colors.white,
        '&:hover': {
            backgroundColor: colors.lightblue,
        },
    },
    profileCard: {
        display: 'flex',
        margin: '16px',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.banner,
    },
    primeInventory: {
        alignItems: '',
        color: colors.primary,
        backgroundColor: colors.banner,
    },
    walletTable: {
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.primary,
        backgroundColor: colors.banner,
    },
    walletBalances: {
        textTransform: 'uppercase',
    },
    profileInfo: {
        margin: '16px',
        rowGap: '16px',
        display: 'grid',
        flexDirection: 'row',
        width: '25%',

        backgroundColor: colors.banner,
    },
    createPrime: {
        backgroundColor: colors.white,
        '&:hover': {
            backgroundColor: colors.green,
            '& .title': {
                color: colors.blue
            },
            '& .icon': {
                color: colors.blue
            },
        },
    },
    primeTable: {
        color: colors.primary,
        backgroundColor: colors.banner,
        textTransform: 'uppercase',
    },
    address: {
        textOverflow: 'ellipsis',
        size: 'small',
        maxWidth: '0%',
        width: '0%',
        minWidth: '0%',
        color: colors.primary,
        backgroundColor: colors.banner,
    },
    buttonText: {
        padding: '4px',
        width: '100%',
    },
    submitInventory: {
        margin: '16px',
        color: colors.blue,
        display: 'flex',
        minHeight: '10%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
        backgroundColor: colors.banner,
        color: colors.primary,
        '&:hover': {
            backgroundColor: colors.primary,
            color: colors.banner,
        },
    },
    addressButton: {
        backgroundColor: colors.secondary,
        color: colors.banner,
        '&:hover': {
            backgroundColor: colors.primary,
        },
    },
    linkButton: {
        backgroundColor: colors.banner,
        color: colors.primary,
        '&:hover' : {
            backgroundColor: colors.primary,
            color: colors.banner,
        },
        letterSpacing: '1px',
        textTransform: 'uppercase',
        height: '100%',
        fontWeight: '700',
        align: 'center',
        justify: 'center',
        textAlign: 'center',
    },
    mintButton: {
        backgroundColor: colors.primary,
        color: colors.banner,
        '&:hover' : {
            backgroundColor: colors.banner,
            color: colors.primary,
            fontWeight: '600',
        },
        fontWeight: '500',
        marginLeft: '24px',
    },
});

class Inventory extends Component {
    constructor(props){
        super(props)
        this.state = INITIAL_CONTEXT;
        this.hasDuplicates = this.hasDuplicates.bind(this);
        this.getWeb3 = this.getWeb3.bind(this);
        this.getAccount = this.getAccount.bind(this);
        this.getNetwork = this.getNetwork.bind(this);
        this.getTokenAddress = this.getTokenAddress.bind(this);
        this.handleApprove = this.handleApprove.bind(this);
        this.getContractInstance = this.getContractInstance.bind(this);
        this.getBalanceOfPrime = this.getBalanceOfPrime.bind(this);
        this.getOwnerOfPrime = this.getOwnerOfPrime.bind(this);
        this.getPrimeProperties = this.getPrimeProperties.bind(this);
        this.getPastEvents = this.getPastEvents.bind(this);
        this.getPrimeInventory = this.getPrimeInventory.bind(this);
        this.openPrime = this.openPrime.bind(this);
        this.primeExercise = this.primeExercise.bind(this);
        this.primeClose = this.primeClose.bind(this);
        this.getBalanceOfErc20 = this.getBalanceOfErc20.bind(this);
        this.getTokenAbi = this.getTokenAbi.bind(this);
        this.getWalletData = this.getWalletData.bind(this);
        this.handleMint = this.handleMint.bind(this);
        this.getProfitData = this.getProfitData.bind(this);
        this.getBankData = this.getBankData.bind(this);
        this.getBankInventory = this.getBankInventory.bind(this);
        this.getMintedPrimes = this.getMintedPrimes.bind(this);
        this.getDeactivatedPrimes = this.getDeactivatedPrimes.bind(this);
        this.getActivePrimes = this.getActivePrimes.bind(this);


        const data = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
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
                data: [65, 59, 80, 81, 56, 55, 40]
              }
            ]
          };

        this.state = {
            web3: props.web3,
            goToPrime: props.goToPrime,
            primeOpen: false,
        }
        
        
    };

    componentDidMount = async () => {
        const web3 = await this.getWeb3();
        this.setState({
            web3: web3,
        });
        console.log('WEB3: ', this.state.web3)
        await this.getAccount();
        await this.getBalanceOfPrime();
        await this.getOwnerOfPrime('2');
        await this.getPrimeProperties('2');
        await this.getPastEvents('PrimeMinted');
        await this.getPrimeInventory();
        await this.getWalletInventory();
        await this.getBankInventory();
        await this.getProfitData();
        await this.getActivePrimes();
        
    };

    getWeb3 = () =>
        new Promise((resolve, reject) => {
          // Wait for loading completion to avoid race conditions with web3 injection timing.
            window.addEventListener("load", async () => {
                // Modern dapp browsers...
                if (window.ethereum) {
                    const web3 = new Web3(window.ethereum);
                    try {
                        // Request account access if needed
                        await window.ethereum.enable();
                        // Acccounts now exposed
                        resolve(web3);
                    }   catch (error) {
                        reject(error);
                    }
                }
                // Legacy dapp browsers...
                else if (window.web3) {
                    // Use Mist/MetaMask's provider.
                    const web3 = window.web3;
                    console.log("Injected web3 detected.");
                    resolve(web3);
                }
                // Fallback to localhost; use dev console port by default...
                else {
                    const provider = new Web3.providers.HttpProvider(
                      "http://127.0.0.1:7545"
                    );
                    const web3 = new Web3(provider);
                    console.log("No web3 instance injected, using Local web3.");
                    resolve(web3);
                }
            });
    });

    hasDuplicates = (array) => {
        var valuesSoFar = Object.create(null);
            for (var i = 0; i < array.length; ++i) {
                var value = array[i];
                if (value in valuesSoFar) {
                    console.log('DUPLICATES FOUND:', array)
                    return true;
                }
                valuesSoFar[value] = true;
            }
            console.log('NO DUPLICATES FOUND:', array)
            return false;
    };
 
    getAccount = async () => {
        console.time('getAccount');
        const web3 = this.state.web3;
        if(web3) {
            let accounts = await web3.eth.getAccounts();
            let account = accounts[0];
            /* console.trace({account}) */
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
            this.setState({
                networkId: networkId,
            });
            console.timeEnd('getTokenAddress');
            return(networkId);
        }
        console.timeEnd('getNetwork');
    };

    getContractInstance = async (Contract) => {
        console.time('getContractInstance');
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
                [contractName]: newArray,
            }
        });
        console.timeEnd('getContractInstance');
        return instance;
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

    getBalanceOfPrime = async () => {
        console.time('getBalanceOfPrime')
        // GET WEB3 AND ACCOUNT
        const web3 = this.state.web3;

        // GET INJECTED ACCOUNT
        const account = await this.getAccount();

        // GET PRIME CONTRACT
        let primeInstance = await this.getContractInstance(PrimeContract);

        let result = await primeInstance.methods.balanceOf(
            account
        ).call();
        this.setState({
            primeBalance: result,
        });
        console.timeEnd('getBalanceOfPrime');
        return result;
    };

    getBalanceOfErc20 = async () => {
        console.time('getBalanceOfErc20')
        // GET WEB3 AND ACCOUNT
        const web3 = this.state.web3;

        // GET INJECTED ACCOUNT
        const account = await this.getAccount();

        // GET PRIME CONTRACT
        let ercInstance = await this.getContractInstance(Erc20);

        let result = await ercInstance.methods.balanceOf(
            account
        ).call();
        this.setState({
            ercBalance: result,
        });
        console.timeEnd('getBalanceOfErc20');
        return result;
    };

    getOwnerOfPrime = async (tokenId) => {
        console.time('getOwnerOfPrime')
        // GET WEB3 AND ACCOUNT
        const web3 = this.state.web3;

        // GET INJECTED ACCOUNT
        const account = await this.getAccount();

        // GET PRIME CONTRACT
        let primeInstance = await this.getContractInstance(PrimeContract);

        let result = await primeInstance.methods.ownerOf(
            tokenId
        ).call();
        this.setState({
            ownerOf: {
                [tokenId]: result,
            }
        });
        console.timeEnd('getOwnerOfPrime');
        return result;
    };

    getPrimeProperties = async (tokenId) => {
        console.time('getPrimeProperties')
        // GET WEB3 AND ACCOUNT
        const web3 = this.state.web3;

        // GET INJECTED ACCOUNT
        const account = await this.getAccount();

        // GET PRIME CONTRACT
        let primeInstance = await this.getContractInstance(PrimeContract);

        let result = await primeInstance.methods.getPrime(
            tokenId
        ).call();
        this.setState({
            primeTokens: {
                [tokenId]: result
            }
        });
        console.timeEnd('getPrimeProperties');
        console.log({result});
        return result;
    };

    getPastEvents = async (event) => {
        // GET PRIME CONTRACT
        let primeInstance = await this.getContractInstance(PrimeContract);
        const account = await this.getAccount();
        let result = await primeInstance.getPastEvents(event, {
            filter: {_user: account},
            fromBlock: 0,
            toBlock: 'latest',
        });
        let returnValues = [];
        for(var i = 0; i < result.length; i++){
            returnValues.push(result[i].returnValues);
        }
        
        let userMintedPrimes = [];
        for(var i = 0; i < result.length; i++){
            userMintedPrimes.push(result[i].returnValues['_tokenId']);
        }

        this.setState({
            pastEvents: {
                [event]: result,
            },
            returnValues: {
                [event]: returnValues,
            },
            userMintedPrimes: {
                [account] : userMintedPrimes,
            }
        });
        /* console.log(result);
        console.log({returnValues})
        console.log({userMintedPrimes}) */
        return result;
    };

    getPrimeInventory = async () => {
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();
        let primeInstance = await this.getContractInstance(PrimeContract);

        let nonce = await primeInstance.methods.nonce().call();

        function createData(tokenId, xis, yakSymbol, zed, waxSymbol, pow, gem, position) {
            return { tokenId, xis, yakSymbol, zed, waxSymbol, pow, gem, position };
        };

        let primeRows = [];
        let activePrimes = await this.getActivePrimes();
        let userOwnedPrimes = [];
        let position = {};

        for(var i = 1; i <= nonce; i++) {
            if((await this.getOwnerOfPrime(i)) === account) {
                userOwnedPrimes.push(i);
                position[`${i}`] = 'Long';
            } else {
                console.log('Does not own: ', i)
                if(activePrimes.indexOf(`${i}`) !== -1) {
                    position[`${i}`] = 'Short';
                    userOwnedPrimes.push(i);
                }
            }
        };

        console.log({position})

        for(var i = 0; i < userOwnedPrimes.length; i++) {
            let properties = await this.getPrimeProperties(userOwnedPrimes[i]);
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

            let tokenId = userOwnedPrimes[i];
            let xis = await web3.utils.fromWei(properties['xis']);
            let zed = await web3.utils.fromWei(properties['zed']);
            const date = new Date(properties['pow'] * 1000);
            let pow = (date.toDateString());
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
    };

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

    openPrime = () => {
        this.setState({
            primeOpen: !this.state.primeOpen,
        });
        console.log(this.state.primeOpen)
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

    getActivePrimes = async () => {
        let minted = await this.getMintedPrimes();
        let inactive = await this.getDeactivatedPrimes();

        let activePrimes = minted.filter(val => !inactive.includes(val));
        console.log(activePrimes)
        this.setState({
            activePrimes: activePrimes
        });
        return activePrimes;
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

        let primeRows = (this.props.primeRows) ? this.props.primeRows : [];
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

    render() {
        const { classes } = this.props;
        const openInventory = (this.props.primeRows) 
                                ? (this.props.primeRows.length > 0) 
                                    : false
                                        ? true : false;

        return (

            /* INVENTORY PAGE CONTAINER */
            <div className={classes.root} key='inventory'>

                    {/* NAVIGATION */}
                    {/* <Card className={classes.submitInventory}>
                        <Button 
                            href={`/prime`}
                            className={classes.linkButton}
                        >
                            <Typography variant={'h1'}>
                                Prev Page
                            </Typography>
                        </Button>
                    </Card> */}


                    {/* CORE INTERFACE */}
                    <Card className={classes.profileCard}>
                        {!openInventory ? (
                            <Typography>
                                <Button
                                    className={classes.createPrime}
                                    onClick={() => this.props.goToDashboard()}
                                >
                                    Create Prime
                                </Button>
                            </Typography>
                        ) : (
                            <Fade in={openInventory} timeout={500}>
                                <Interface 
                                    classes={classes}
                                    primeRows={this.props.primeRows}
                                    primeExercise={this.props.primeExercise}
                                    primeClose={this.props.primeClose}
                                    data={this.props.data}
                                    statsData={this.props.statsData}
                                />
                            </Fade>
                        )}
                    </Card>

                    {/* INVENTORY CONTAINER */}
                    <Grid container className={classes.profileInfo}>

                        {/* PRIME INVENTORY CONTAINER */}
                        <PrimeTable 
                            primeRows={this.props.primeRows}
                        />
                        
                        {/* WALLET INVENTORY CONTAINER */}
                        <WalletTable
                            walletRows={this.props.walletRows}
                            handleMint={this.props.handleMint}
                            balancesOf={'Wallet'}
                        />
                        <WalletTable
                            walletRows={this.props.bankRows}
                            handleMint={this.props.handleMint}
                            balancesOf={'Bank'}
                        />

                    </Grid>


                    {/* NAVIGATION */}
                    {/* <Card className={classes.submitInventory}>
                        <Button 
                            href={`/inventory/${this.props.account}`}
                            className={classes.linkButton}
                        >
                            <Typography variant={'h1'}>
                                Next Page
                            </Typography>
                        </Button>
                    </Card> */}

            </div>
        );
    };
};

export default (withRouter(withStyles(styles)(Inventory)));