import React, { Component, PureComponent, useEffect } from 'react';
import { withRouter } from "react-router-dom";
import Link from 'react-router-dom/Link';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import { DragDropContext } from 'react-beautiful-dnd';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import ArrowLeftIcon from '@material-ui/icons/ArrowLeft';
import INITIAL_CONTEXT from './constants';
import Column from './column';
import Web3 from 'web3';
import PrimeContract from '../../artifacts/Prime.json';
import Slate from '../../artifacts/Slate.json';
import TOKENS_CONTEXT from './tokenAddresses';
import Underlying from '../../artifacts/Underlying.json';
import Strike from '../../artifacts/Strike.json';
import Page from './page';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { Tab } from '@material-ui/core';
import Erc20 from '../../artifacts/Strike.json';


const styles = theme => ({
    root: {
        flex: 1,
        display: 'flex',
        width: '100%',
        height: '100vh',
        justifyContent: 'left',
        alignItems: 'center',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        }
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
        }
    },
    transitionButton: {
        //display: 'flex',
        height: '100%',
        width: '5%',
        backgroundColor: colors.lightGrey,
        '&:hover': {
            backgroundColor: colors.lightblue,
        },
    },
    profileCard: {
        display: 'flex',
       /*  minHeight: '96%', */
        height: '96%',
        margin: '16px',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primeInventory: {
        alignItems: '',
        height: '100%',
        
    },
    walletBalances: {
        height: '100%',
    },
    profileInfo: {
        margin: '16px',
        rowGap: '16px',
        display: 'grid',
        flexDirection: 'row',
        width: '25%',
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
        this.testWeb3 = this.testWeb3.bind(this);
        this.getBalanceOfPrime = this.getBalanceOfPrime.bind(this);
        this.getOwnerOfPrime = this.getOwnerOfPrime.bind(this);
        this.getPrimeProperties = this.getPrimeProperties.bind(this);
        this.getPastEvents = this.getPastEvents.bind(this);
        this.getPrimeInventory = this.getPrimeInventory.bind(this);


        this.state = {
            web3: props.web3,
            goToPrime: props.goToPrime,
        }
    };

    componentDidMount = async () => {
        const web3 = await this.getWeb3();
        this.setState({
            web3: web3,
        })
        console.log('WEB3: ', this.state.web3)
        await this.getAccount();
        await this.getBalanceOfPrime();
        await this.getOwnerOfPrime('2');
        await this.getPrimeProperties('2');
        await this.getPastEvents('SlateMinted');
        await this.getPrimeInventory();
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

        let result = await primeInstance.methods.getSlate(
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

        function createData(tokenId, xis, yakSymbol, zed, waxSymbol, pow, gem) {
            return { tokenId, xis, yakSymbol, zed, waxSymbol, pow, gem };
        };
        let primeRows = [];

        let userMintedPrimes = this.state.userMintedPrimes[account];
        let userOwnedPrimes = [];
        for(var i = 0; i < userMintedPrimes.length; i++) {
            if(this.getOwnerOfPrime(userMintedPrimes[i])) {
                userOwnedPrimes.push(userMintedPrimes[i]);
            } else {
                console.log('Does not own: ', userMintedPrimes[i])
            }
        };
        
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
            );

            primeRows.push(data)
            console.log({primeRows})
        }

        

        this.setState({
            primeRows: primeRows,
        });
        console.log(this.state.userMintedPrimes[account])
    };

    testWeb3 = async () => {
        this.forceUpdate();
        await this.getAccount();
        console.log(this.state.web3, this.state.account)
        this.handleApprove((await this.getContractInstance(Strike)), this.state.account, 10, this.state.account);
    };


    render() {
        const { classes } = this.props;
        const primeRows = (this.state.primeRows) ? (this.state.primeRows) : [];
        return (
            <Page display='flex'>
                <div className={classes.root}>
                <Box className={classes.boards}>
                    <Button 
                        className={classes.transitionButton} 
                        onClick={() => this.props.goToPrime()}
                    >
                        {<ArrowLeftIcon />}Prev Page
                    </Button>
                    <Card className={classes.profileCard}>
                    <Typography>
                        <Button
                            className={classes.createPrime}
                            onClick={() => this.testWeb3()}
                        >
                            Create Prime
                        </Button>
                    </Typography>
                    </Card>

                    <Grid container className={classes.profileInfo}>
                        <Grid item>
                            <Card className={classes.primeInventory}>
                                <Typography className={classes.title}>
                                    Prime Inventory
                                </Typography>

                                <TableContainer component={Paper}>
                                    <Table className={classes.primeTable}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell align='right'>ID#</TableCell>
                                                <TableCell align='right'>Collateral</TableCell>
                                                {/* <TableCell align='right'>Symbol</TableCell> */}
                                                <TableCell align='right'>Payment</TableCell>
                                                {/* <TableCell align='right'>Symbol</TableCell> */}
                                                <TableCell align='right'>Expires</TableCell>
                                                <TableCell align='right'>Paid To</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {primeRows.map(row => (
                                                <TableRow key={row.name}>
                                                    <TableCell align='right'>{row.tokenId}</TableCell>
                                                    <TableCell align='right'>{row.xis} {row.yakSymbol}</TableCell>
                                                    <TableCell align='right'>{row.zed} {row.waxSymbol}</TableCell>
                                                    <TableCell align='right'>{row.pow}</TableCell>
                                                    <TableCell align='right'>{row.gem}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                            </Card>
                        </Grid>
                        <Grid item>
                            <Card className={classes.walletBalances}>
                                <Typography className={classes.title}>
                                    Wallet Balances
                                </Typography>
                            </Card>
                        </Grid>
                    </Grid>

                    
                    <Button
                        className={classes.transitionButton}
                    >
                        Next Page{<ArrowRightIcon />}
                    </Button>
                </Box>
                </div>
            </Page>
        );
    };
};

export default (withRouter(withStyles(styles)(Inventory)));