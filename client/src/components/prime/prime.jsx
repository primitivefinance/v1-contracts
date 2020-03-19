import React, { Component, PureComponent } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import Box from '@material-ui/core/Box';
import LinkM from '@material-ui/core/Link';
import GitHubIcon from '@material-ui/icons/GitHub';
import TwitterIcon from '@material-ui/icons/Twitter';

import Web3 from 'web3';
import HorizontalNonLinearStepper from './stepper';
import Board from './board';
import Column from './column';
import OrderSummary from './summary';
import NavButton from './navButton';
import Footer from './footer';

import INITIAL_CONTEXT from './constants';
import TOKENS_CONTEXT from './tokenAddresses';
import PrimeContract from '../../artifacts/Prime.json';

import PrimeOutput from './primeOutput';


const styles = theme => ({
    root: {
        flex: 1,
        display: 'flex',
        width: '100%',
        height: '100%',
        justifyContent: 'left',
        alignItems: 'flex-start',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: colors.background,
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
    },
    body: {
        flex: 1,
        display: 'flex',
        width: '100%',
        height: '85%',
        justifyContent: 'left',
        alignItems: 'flex-start',
        flexDirection: 'column',
        minHeight: '20vh',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        },
    },
    cells: {
        flex: 1,
        display: 'flex',
        width: '80%',
        minHeight: '20vh',
        flexDirection: 'column',
        flexWrap: 'wrap',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        },
    },

    bottom: {
        flex: 1,
        display: 'flex',
        width: '100%',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        flexDirection: 'column',
        height: '100%',
    },
    
    stepper: {
        display: 'flex',
        active: colors.primary,
    },
});

class InnerList extends PureComponent {
    shouldComponentUpdate(nextProps) {
        if(
            nextProps.column === this.props.column &&
            nextProps.itemMap === this.props.itemMap &&
            nextProps.index === this.props.index &&
            nextProps.isDropDisabled === this.props.isDropDisabled
        ) {
            return false;
        }
        return true;
    }

    render() {
        const { 
            column, 
            itemMap,
        } = this.props;
        const items = column.itemIds.map(itemId => itemMap[itemId]);
        switch(column.id){
            case 'start':
                return null;
            default:
                return  <Column 
                            key={column.id} 
                            column={this.props.column} 
                            items={items} 
                            isDropDisabled={this.props.isDropDisabled} 
                            boardItems={this.props.boardItems}
                            handleUndo={this.props.handleUndo}
                            handleAdd={this.props.handleAdd}
                            handleDelete={this.props.handleDelete}
                            assetMap={this.props.assetMap}
                            expirationMap={this.props.expirationMap}
                            handleBoardSubmit={this.props.handleBoardSubmit}
                            isValid={this.props.isValid}
                            isOnBoard={this.props.isOnBoard}
                            index={this.props.index}
                            handleAssetAmount={this.props.handleAssetAmount}
                        />;
        }
    }
};

class Prime extends Component {
    constructor(props){
        super(props)
        this.state = INITIAL_CONTEXT;
        this.handleUndo = this.handleUndo.bind(this);
        this.handleAdd = this.handleAdd.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.handleBoardSubmit = this.handleBoardSubmit.bind(this);
        this.hasDuplicates = this.hasDuplicates.bind(this);
        this.getWeb3 = this.getWeb3.bind(this);
        this.createPrime = this.createPrime.bind(this);
        this.getAccount = this.getAccount.bind(this);
        this.getNetwork = this.getNetwork.bind(this);
        this.getTokenAddress = this.getTokenAddress.bind(this);
        this.handleApprove = this.handleApprove.bind(this);
        this.getContractInstance = this.getContractInstance.bind(this);
        this.isValid = this.isValid.bind(this);
        this.goToPrime = this.goToPrime.bind(this);
        this.isOnBoard = this.isOnBoard.bind(this);
        this.undoStep = this.undoStep.bind(this);
        this.handleBoardState = this.handleBoardState.bind(this);
        this.handleStepComplete = this.handleStepComplete.bind(this);
        this.handleAssetAmount = this.handleAssetAmount.bind(this);
        this.getInstance = this.getInstance.bind(this);
        this.getCurrentPrimeOutput = this.getCurrentPrimeOutput.bind(this);
    };

    componentDidMount = async () => {
        const web3 = await this.getWeb3();
        this.setState({
            web3: web3,
        })
        let account = await this.getAccount();
        this.setState({
            account: account,
            step: 0,
        });
        console.log('WEB3: ', this.state.web3)
    };

    componentDidUpdate = () => {
        console.log(this.state.boardStates)
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


    /* BOARD STATE FUNCTIONS */
    onDragEnd = result => {
        console.time('onDragEnd');
        
        const { destination, source, draggableId } = result;

        if(!destination) {
            return;
        }

        if(
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }
        const start = this.state.columns[source.droppableId];
        const finish = this.state.columns[destination.droppableId];

        if(start === finish) {
            const newItemIds = Array.from(start.itemIds);
            newItemIds.splice(source.index, 1);
            newItemIds.splice(destination.index, 0, draggableId);

            const newColumn = {
                ...start,
                itemIds: newItemIds,
            };

            const newState = {
                ...this.state,
                columns: {
                    ...this.state.columns,
                    [newColumn.id]: newColumn,
                },
            };

            this.setState(newState);
            return;
        }

        const startItemIds = Array.from(start.itemIds);
        startItemIds.splice(source.index, 1);
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };

        const finishItemIds = Array.from(finish.itemIds);
        finishItemIds.splice(destination.index, 0, draggableId);
        const newFinish = {
            ...finish,
            itemIds: finishItemIds,
        };

        const newState = {
            ...this.state,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
                [newFinish.id]: newFinish,
            },
        };
        this.setState(newState, () => { this.handleBoardState(); /* this.handleStepComplete(draggableId, destination.droppableId); */ });

        // GETS BOARD ITEMS AND PASSES TO DRAGGABLE COMPONENTS
        let boardItems = this.state.boardItems ? this.state.boardItems : [];
        let collateralItems = this.state.collateralItems ? this.state.collateralItems : [];
        let paymentItems = this.state.paymentItems ? this.state.paymentItems : [];
        let expirationItems = this.state.expirationItems ? this.state.expirationItems : [];
        let addressItems = this.state.addressItems ? this.state.addressItems : [];
        let boardArray = [collateralItems, paymentItems, expirationItems, addressItems]

        if(destination.droppableId !== 'start') {
            boardItems.push(draggableId);
            
            let item = draggableId.split('-')[0];
            switch(item) {
                case 'asset':
                    let dest = destination.droppableId;
                    if(dest === 'collateralBoard'){
                        (collateralItems).push(draggableId);
                    } else {
                        (paymentItems).push(draggableId);
                    }
                    break;
                case 'expiration':
                    (expirationItems).push(draggableId);
                    break;
                case 'address':
                    (addressItems).push(draggableId);
                    break;
            }
        }

        if(
            source.droppableId === 'board' &&
            destination.droppableId !== 'board'
        ) {
            let pos = boardItems.indexOf(draggableId);
            boardItems.splice(pos, 1);
            for(var i = 0; i < boardArray.length; i++){
                let pos = (boardArray[i]).indexOf(draggableId);
                (boardArray[i]).splice(pos, 1);
            }
            console.log('remove', boardItems)
        }


        this.setState({
            boardItems: boardItems,
            boardArray: boardArray,
            collateralItems: collateralItems,
            paymentItems: paymentItems,
            expirationItems: expirationItems,
            addressItems: addressItems,
            
        }, );

        console.timeEnd('onDragEnd');
    };

    handleBoardState = () => {
        console.log('HANDLE BOARD STATE')

        /* FOR STEPPER */
        let newCompleted = (this.state.newCompleted) ? this.state.newCompleted : {};
        let index;
        let activeStep;

        /* GET ALL BOARDS */
        let boardNames = Array.from(this.state.columnOrder.slice(1, 10))
        let newBoard = (typeof this.state.boardStates !== 'undefined') ? this.state.boardStates : {};

        /* FOR EACH BOARD, CHECK THE ITEMS */
        for(var i = 0; i < boardNames.length; i++) {
            let itemIds = this.state.columns[boardNames[i]].itemIds;
            let boardName = boardNames[i];

            /* IF BOARD HAS ITEMS, CHECK THEIR TYPES AND RETURN VALIDITY */
            if(itemIds.length > 0) {
                let valid = false;
                let item = itemIds[0];
                let type = (this.state.items[item].id).split('-')[0];
                switch(type) {
                    case 'asset':
                        if(
                            boardName === 'collateralBoard' 
                            || boardName === 'paymentBoard'
                        ) {
                            /* BOARD STATE */
                            valid = true;
                        };
                        break;
                    case 'expiration':
                        index = 2;
                        if(
                            boardName === 'expirationBoard' 
                        ) {
                            /* BOARD STATE */
                            valid = true;
                        };
                        break;
                    case 'address':
                        index = 3;
                        if(
                            boardName === 'addressBoard' 
                        ) {
                            /* BOARD STATE */
                            valid = true;
                        };
                        break;
                };

                /* console.log('UPDATING BOARD STATE: ', {boardName, itemIds, valid}) */
                /* NEW BOARD STATE */
                newBoard[boardName] = {
                    itemIds: itemIds,
                    valid: valid,
                };
            } else {

                /* console.log('REVERTING BOARD STATE: ', {boardName}, [], false) */
                /* SET BOARD STATE TO INITIAL VALUES FOR BOARD  */
                newBoard[boardName] = {
                    itemIds: [],
                    valid: false,
                };
            };
        };

        /* STEPPER */
        let cB = newBoard['collateralBoard'];
        let pB = newBoard['paymentBoard'];
        let eB = newBoard['expirationBoard'];
        let aB = newBoard['addressBoard'];
        let _B = [cB, pB, eB, aB,];
        for(var i = 0; i < _B.length; i++) {
            newCompleted[i] = _B[i].valid;
            activeStep = i;
        }

        /* UPDATE STATE */
        this.setState({
            boardStates: newBoard,
            newCompleted: newCompleted,
            activeStep: activeStep,
        }, () => {this.isValid(); this.getCurrentPrimeOutput();});
    };

    isValid = () => {

        /* GETS BOARD STATE AND RETURNS VALID IF FILLED CORRECTLY */
        let valid;
        let boardState = (typeof this.state.boardStates !== 'undefined') ? this.state.boardStates : 'Board not initialized';
        let collateralValid = (boardState['collateralBoard']) ? (boardState['collateralBoard'].valid) ? true : false : false;
        let paymentValid = (boardState['paymentBoard']) ? (boardState['paymentBoard'].valid) ? true : false : false;
        let expirationValid = (boardState['expirationBoard']) ? (boardState['expirationBoard'].valid) ? true : false : false;
        let addressValid = (boardState['addressBoard']) ? (boardState['addressBoard'].valid) ? true : false : false;
        let collateralAmountValid = (this.state.collateralAmount) ? (this.state.collateralAmount > 0) ? true : false : false;
        let paymentAmountValid = (this.state.paymentAmount) ? (this.state.paymentAmount > 0) ? true : false : false;
        
        if(
            collateralValid && paymentValid && expirationValid
            && collateralAmountValid && paymentAmountValid /* && addressValid */
            && typeof this.state.collateralAmount !== 'undefined'
            && typeof this.state.paymentAmount !== 'undefined'
        ) {
            valid = true;
            console.log('VALID BOARD DETECTED:', boardState);
        } else {
            valid = false;
            /* console.log('BOARD NOT VALID', boardState); */
        }

        this.setState({
            isValid: valid,
        });
        return valid;
    };

    hasDuplicates = (array) => {
        /* CHECKS TWO ARRAYS FOR DUPLICATES */
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

    handleUndo = (itemId, columnId) => {
        console.time('handleUndo');

        /* FOR STEPPER */
        let newCompleted = (this.state.newCompleted) ? this.state.newCompleted : {};
        let index;
        let activeStep;

        /* RETURN ITEM TO ORIGINAL POSITION */
        let currentIndex = columnId;
        let initialIndex = this.state.items[itemId].index;
        if(currentIndex === initialIndex) {return;}
        const start = this.state.columns[columnId];
        const finish = this.state.columns[initialIndex];

        /* UPDATE SOURCE ARRAY */
        const startItemIds = Array.from(start.itemIds);
        startItemIds.splice(startItemIds.indexOf(itemId), 1);
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };

        /* UPDATE DESTINATION ARRAY */
        const finishItemIds = Array.from(finish.itemIds);
        finishItemIds.push(itemId)
        const newFinish = {
            ...finish,
            itemIds: finishItemIds,
        };

        /* NEW SOURCE AND DESTINATION COLUMN DATA */
        const newState = {
            ...this.state,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
                [newFinish.id]: newFinish,
            },
        };

        this.setState(newState, () => { this.handleBoardState(); this.undoStep(itemId, columnId); });
        console.timeEnd('handleUndo');
    };

    handleDelete = (itemId, columnId) => {
        console.time('handleDelete');

        /* DELETE ITEM */
        let currentIndex = columnId;
        const start = this.state.columns[columnId];

        /* UPDATE SOURCE ARRAY */
        const startItemIds = Array.from(start.itemIds);
        startItemIds.splice(startItemIds.indexOf(itemId), 1);
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };

        /* NEW SOURCE DATA */
        const newState = {
            ...this.state,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
            },
        };

        /* UPDATES STATE */
        this.setState(newState, () => { this.handleBoardState(); this.undoStep(itemId, columnId); });
        console.timeEnd('handleDelete');
    };

    handleAdd = (itemId, columnId, address) => {
        console.time('handleAdd');

        /* ADD AN ITEM TO A COLUMN */
        if(this.isValid()) {return;}
        let currentIndex = columnId;
        const start = this.state.columns['start'];
        const startItemIds = Array.from(start.itemIds);
        let items = this.state.items;

        /* PREVENT DUPLICATES IN THE SAME COLUMN */
        if(columnId === 'start' && address !== '') {
            const newAddress = {
                'newAddress': {
                    id: `address-${address}`,
                    content: address,
                    type: 'address',
                    index: 'start',
                    payload: address,
                },
            };

            items[`address-${address}`] = newAddress['newAddress'];
            itemId = `address-${address}`;
        }

        /* UPDATE ITEMS LOCALLY */
        console.log({items, itemId})
        startItemIds.push(items[itemId].id);
        if(this.hasDuplicates(startItemIds) || this.isValid()) {
            return;
        }

        /* NEW SOURCE COLUMN ITEMS DATA */
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };

        const newState = {
            ...this.state,
            items: items,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
            },
        };

        /* UPDATES STATE */
        this.setState(newState, () => this.handleBoardState());
        console.timeEnd('handleAdd');
    };
    
    handleBoardSubmit = async () => {
        console.time('handleBoardSubmit');
        console.log('HANDLE BOARD SUBMIT', this.state.boardItems)

        /* GET BOARD STATE AND LOAD INTO PAYLOAD FOR ETHEREUM TX */
        let payloadArray = [];
        let collateralAsset;
        let paymentAsset;
        let addressReceiver;
        let expirationDate;
        const boardState = this.state.boardStates;
        
        /* 
        * IN THIS CURRENT ITERATION, ONLY ONE ITEM IS ALLOWED PER BOARD,
        * SO THE ITEM ID WILL ALWAYS BE AT 0 INDEX. WILL CHANGE IN FUTURE ITERATIONS.
        * ALSO THE BOARDS HAVE SPECIFIC NAMES, WILL CHANGE IN FUTURE.
        */
        let _collateral = boardState['collateralBoard'].itemIds[0];
        let _payment = boardState['paymentBoard'].itemIds[0];
        let _expiration = boardState['expirationBoard'].itemIds[0];
        let _address = boardState['addressBoard'].itemIds[0];

        /* 
        * IRDER MATTERS - FIX - CAN BE IMPROVED 
        * 0 = COLLATERAL
        * 1 = PAYMENT 
        */
        let _paramIds = [
            _collateral, 
            _payment, 
            _expiration,
            /* _address */ /* DEACTIVATED WITH DISABLED ACCOUNT RECEIVER */
        ];

        /* GET ITEM PAYLOAD AND TYPE AND PUSH TO ARRAY - FIX - CAN BE IMPROVED*/
        for(var i = 0; i < _paramIds.length; i++){
            let type;
            let items = this.state.items;
            let item = items[(_paramIds[i])];
            let payload = item.payload;
            switch(i) {
                case 0:
                    type = 'collateralAsset';
                    break;
                case 1:
                    type = 'paymentAsset';
                    break;
                default:
                    type = item.type;
                    break;
            };

            if(payload){
                payloadArray.push([type, payload]);
            }
        };

        /* LINK PAYLOAD INFO TO PARAMETER BY USING PAYLOAD ARRAY */
        for(var x = 0; x < payloadArray.length; x++) {
            switch(payloadArray[x][0]) {
                case 'expiration':
                    expirationDate = payloadArray[x][1];
                    break;
                case 'collateralAsset':
                    collateralAsset = payloadArray[x][1];
                    break;
                case 'paymentAsset':
                    paymentAsset = payloadArray[x][1];
                    break;
                case 'address':
                    addressReceiver = payloadArray[x][1];
                    break;
            }
        }

        /* GET QUANTITY OF ASSETS */
        let collateralAmount = (this.state.collateralAmount) ? (this.state.collateralAmount) : undefined;
        let paymentAmount = (this.state.paymentAmount) ? (this.state.paymentAmount) : undefined;
        if(
            typeof collateralAmount === 'undefined'
            || typeof paymentAmount === 'undefined'
        ) {
            console.log({collateralAmount, paymentAmount}, 'COLLAT OR PAYMENT QTY UNDEFINED')
            return;
        }
        console.log({collateralAmount, paymentAmount})

        /* PASS PARAMETERS TO CONTRACT FUNCTION AND SEND TRANSACTION */
        try {
            await this.createPrime(
                collateralAsset,
                paymentAsset,
                addressReceiver,
                expirationDate,
                collateralAmount,
                paymentAmount
            );
        } catch(error) {
            console.log({error})
        }

        console.trace({
            payloadArray, 
            collateralAsset, 
            paymentAsset, 
            addressReceiver, 
            expirationDate, 
            collateralAmount,
            paymentAmount 
        });
        console.timeEnd('handleBoardSubmit');
    };

    isOnBoard = (itemId, columnId) => {
        let isOnBoard = false;
        let boardState = (this.state.boardStates) ? this.state.boardStates : '';
        let columns = this.state.columnOrder.slice(1, 10);
        if(boardState !== '' && columnId !== 'start') {
            let board = boardState[columnId];
            if(typeof board !== 'undefined') {
                let index = board.itemIds.indexOf(itemId);
                if(index !== -1) {
                    if(board.valid) {
                        isOnBoard = true;
                    };
                };
            };
        };
    
        return isOnBoard;
    };

    undoStep = (itemId, columnId) => {
        /* FOR STEPPER */
        let newCompleted = (this.state.newCompleted) ? this.state.newCompleted : {};
        let index;
        let activeStep;
        let itemType = (this.state.items[itemId].type).split('-')[0];
        switch(itemType) {
            case 'asset':
                switch(columnId) {
                    case 'collateralBoard':
                        /* STEPPER */
                        index = 0;
                        newCompleted[index] = false;
                        activeStep = index;
                        break;
                    case 'paymentBoard':
                        /* STEPPER */
                        index = 1;
                        newCompleted[index] = false;
                        activeStep = index - 1;
                        break;
                }
                break;
            case 'expiration':
                /* STEPPER */
                index = 2;
                newCompleted[index] = false;
                activeStep = index - 1;
                break;

            case 'address':
                /* STEPPER */
                index = 3;
                newCompleted[index] = false;
                activeStep = index - 1;
                break;

        }
        this.setState({
            newCompleted: newCompleted,
            activeStep: activeStep,
        });
    };

    handleStepComplete = (itemId, columnId) => {
        let items = this.state.items;
        let itemType = (items[itemId].type).split('-')[0];
        let newCompleted = (this.state.newCompleted) ? this.state.newCompleted : {};
        let index;
        let activeStep;
        switch(columnId) {
            case 'collateralBoard':
                if(itemType === 'asset') {
                    console.log('C asset on C board')
                    index = 0;
                    newCompleted[index] = true;
                    activeStep = index;
                }
                break;
            case 'paymentBoard':
                if(itemType === 'asset') {
                    console.log('P asset on P board')
                    index = 1;
                    newCompleted[index] = true;
                    activeStep = index;
                }
                break;
            case 'expirationBoard':
                if(itemType === 'expiration') {
                    console.log('Expiration on E board')
                    index = 2;
                    newCompleted[index] = true;
                    activeStep = index;
                }
                break;
            case 'addressBoard':
                if(itemType === 'address') {
                    console.log('Address on A board')
                    index = 3;
                    newCompleted[index] = true;
                    activeStep = index;
                }
                break;
        }

        console.log({newCompleted, index})
        this.setState({
            newCompleted: newCompleted,
            activeStep: index,
        })
        return newCompleted;
    };

    handleAssetAmount = async (columnId, amount) => {
        const web3 = this.state.web3;
        let collateralAmount = (this.state.collateralAmount) ? this.state.collateralAmount : 0;
        let paymentAmount = (this.state.paymentAmount) ? this.state.paymentAmount : 0;
        let amtWei;
        console.log({amount})
        let rawAmt = (amount) ? (amount).toString() : '0';
        switch(columnId) {
            case 'collateralBoard':
                amtWei = (await web3.utils.toWei(rawAmt)).toString();
                collateralAmount = amtWei;
                break;
            case 'paymentBoard':
                amtWei = (await web3.utils.toWei(rawAmt)).toString();
                paymentAmount = amtWei;
                break;  
        };

        this.setState({
            collateralAmount: collateralAmount,
            paymentAmount: paymentAmount,
        }, () => {this.isValid(); this.getCurrentPrimeOutput();})
        console.log('HANDLE ASSET AMOUNT', {collateralAmount, paymentAmount})
    };

    /* WEB3 FUNCTIONS */
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

    createPrime = async (
            collateralAsset, 
            paymentAsset, 
            addressReceiver, 
            expirationDate,
            collateralAmount,
            paymentAmount
        ) => 
    {
        // GET WEB3 AND ACCOUNT
        const web3 = this.state.web3;

        /* console.trace({web3}) */
        const account = await this.getAccount();

        // GET NETWORK ID
        const networkId = await this.getNetwork();

        // GET PRIME CONTRACT
        let primeInstance = await this.getContractInstance(PrimeContract);
        let collateralInstance = await this.getInstance(collateralAsset);


        // CALL PRIME METHOD
        if(typeof primeInstance !== 'undefined') {
            let nonce = await primeInstance.methods.nonce().call();
            let DEFAULT_AMOUNT_WEI = await web3.utils.toWei((1).toString());
            /* 
            * TOKENS_CONTEXT is a constant that can search for addresses of assets
            * TOKENS_CONTEXT[NETWORKID][TOKEN_SYMBOL].address
            */

            let primeAddress = primeInstance._address;
            await this.handleApprove(
                collateralInstance, 
                primeAddress, 
                collateralAmount, 
                account
            );

            addressReceiver = account;
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
            let result = await primeInstance.methods.createPrime(
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
                createPrimeTx: result,
            });
            console.trace({result});
        }
        console.timeEnd('createPrime');
    };

    goToPrime = () => {
        this.setState({
            inventoryPage: !this.state.inventoryPage,
        });
    };

    getCurrentPrimeOutput = async () => {
        const web3 = this.state.web3;
        const account = await this.getAccount();
        const networkId = await this.getNetwork();
        let primeInstance = await this.getContractInstance(PrimeContract);
        let xis, yakSymbol, zed, waxSymbol, pow;
        let nonce = await primeInstance.methods.nonce().call();

        function createData( xis, yakSymbol, zed, waxSymbol, pow) {
            return { xis, yakSymbol, zed, waxSymbol, pow };
        };

        let primeOutput = [];
        
        let collateral = (this.state.collateralAmount) ? this.state.collateralAmount : 0;
        let payment = (this.state.paymentAmount) ? this.state.paymentAmount : 0;
        let expiration = (this.state.boardStates['expirationBoard'].itemIds[0]) ? this.state.boardStates['expirationBoard'].itemIds[0] : 'N/A';
        let collateralSym = (this.state.boardStates['collateralBoard'].itemIds[0]) 
                                ? this.state.items[this.state.boardStates['collateralBoard'].itemIds[0]].content
                                    : '';
        let paymentSym = (this.state.boardStates['paymentBoard'].itemIds[0]) 
                                ? this.state.items[this.state.boardStates['paymentBoard'].itemIds[0]].content
                                    : '';
                                


        xis = await web3.utils.fromWei((collateral).toString());
        yakSymbol = collateralSym;
        zed = await web3.utils.fromWei((payment).toString());
        waxSymbol = paymentSym;
        pow = this.state.items[expiration].payload;
        const date = new Date(pow * 1000);
        pow = (date.toDateString());
        let data = createData(
            xis,
            yakSymbol,
            zed,
            waxSymbol,
            pow,
        );

        primeOutput.push(data)
        console.log({primeOutput})
        this.setState({
            primeOutput: primeOutput,
        })
        return primeOutput;
    };

    render() {
        const { classes } = this.props;

        return (
            <div className={classes.root}>

                {/* STEPPER */}
                <HorizontalNonLinearStepper 
                    undoStep={this.undoStep}
                    boardStates={this.state.boardStates}
                    activeStep={this.state.activeStep}
                    newCompleted={this.state.newCompleted}
                    className={classes.stepper}
                    classes={classes}
                />

                {/* CORE BOARD INTERFACE */}
                <div className={classes.body} key='prime'>
                    <DragDropContext 
                        onBeforeDragStart={this.onBeforeDragStart}
                        onDragStart={this.onDragStart}
                        onDragEnd={this.onDragEnd}
                    >
                        {/* BOARD */}
                        <Board 
                            key={'start'} 
                            column={this.state.columns['start']} 
                            items={this.state.columns['start'].itemIds.map(itemId => this.state.items[itemId])} 
                            index={0}
                            boardItems={this.state.boardItems}
                            handleUndo={this.handleUndo}
                            handleAdd={this.handleAdd}
                            handleDelete={this.handleDelete}
                            handleBoardSubmit={this.handleBoardSubmit}
                            assetMap={this.state.assets}
                            expirationMap={this.state.expirations}
                            isValid={this.state.isValid}
                            isOnBoard={this.isOnBoard}
                        />

                        {/* CELLS */}
                        <Box className={classes.cells}>
                            {this.state.columnOrder.map((columnId, index) => {
                                const column = this.state.columns[columnId];
                                let boardState = (this.state.boardStates) ? this.state.boardStates : [];
                                let isDropDisabled = (index > 3) 
                                    ? true 
                                        : (typeof boardState[columnId] !== 'undefined') 
                                            ? boardState[columnId].valid
                                                : false;
                                return (
                                    <InnerList
                                        key={column.id}
                                        column={column}
                                        itemMap={this.state.items}
                                        index={index}
                                        isDropDisabled={isDropDisabled}
                                        boardItems={this.state.boardItems}
                                        handleUndo={this.handleUndo}
                                        handleAdd={this.handleAdd}
                                        handleDelete={this.handleDelete}
                                        handleBoardSubmit={this.handleBoardSubmit}
                                        assetMap={this.state.assets}
                                        expirationMap={this.state.expirations}
                                        isValid={this.state.isValid}
                                        isOnBoard={this.isOnBoard}
                                        handleAssetAmount={this.handleAssetAmount}
                                    />
                                );
                            })}
                        </Box>
                    </DragDropContext>

                    {/* ORDER SUMMARY */}
                    <OrderSummary
                        boardStates={this.state.boardStates}
                        items={this.state.items}
                        collateralAmount={this.state.collateralAmount}
                        paymentAmount={this.state.paymentAmount}
                        handleAssetAmount={this.handleAssetAmount}
                        handleBoardSubmit={this.handleBoardSubmit}
                        isValid={this.state.isValid}
                        primeRows={this.state.primeOutput}
                    />

                    {/* NAVIGATION */}
                    <NavButton 
                        text={'Next'}
                        link={`/inventory/${this.state.account}`}
                    />
                </div>


                {/* BOTTOM STEPPER AND FOOTER */}
                <div className={classes.bottom}>
                    {/* <HorizontalNonLinearStepper 
                        undoStep={this.undoStep}
                        boardStates={this.state.boardStates}
                        activeStep={this.state.activeStep}
                        newCompleted={this.state.newCompleted}
                        className={classes.stepper}
                        classes={classes}
                        bottom={true}
                        disabled={true}
                    /> */}

                    {/* <PrimeOutput 
                        primeRows={this.state.primeOutput}
                    /> */}
                    <Footer 
                        title={
                            <div>
                                <LinkM href="https://github.com/Alexangelj/DFCP" underline='none'>
                                    <GitHubIcon />
                                </LinkM>
                                <LinkM href="https://github.com/Alexangelj/DFCP" underline='none'>
                                    <TwitterIcon />
                                </LinkM>
                            </div>
                        }
                    />
                </div>

            </div>
        );
    };
};

export default (withRouter(withStyles(styles)(Prime)));