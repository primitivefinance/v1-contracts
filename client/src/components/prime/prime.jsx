import React, { Component, PureComponent } from 'react';
import { withRouter } from "react-router-dom";
import Link from 'react-router-dom/Link';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import { DragDropContext } from 'react-beautiful-dnd';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import Button from '@material-ui/core/Button';
import Popover from '@material-ui/core/Popover';
import Box from '@material-ui/core/Box';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import Slide from '@material-ui/core/Slide';
import Collapse from '@material-ui/core/Collapse';
import LinkM from '@material-ui/core/Link';
import INITIAL_CONTEXT from './constants';
import Column from './column';
import Web3 from 'web3';
import PrimeContract from '../../artifacts/Prime.json';
import Slate from '../../artifacts/Slate.json';
import TOKENS_CONTEXT from './tokenAddresses';
import Underlying from '../../artifacts/Underlying.json';
import Strike from '../../artifacts/Strike.json';
import Page from './page';
import Inventory from './inventory';
import HorizontalNonLinearStepper from './stepper';
import Board from './board';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';


const styles = theme => ({
    root: {
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
        }
    },
    boards: {
        flex: 1,
        display: 'flex',
        width: '80%',
        minHeight: '20vh',
        flexDirection: 'column',
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
        display: 'flex',
        height: '100%',
        minHeight: '100vh',
        backgroundColor: colors.white,
        '&:hover': {
            backgroundColor: colors.lightblue,
        },
    },
    submitButton: {
        display: 'flex',
        height: '100%',
        minHeight: '100vh',
        backgroundColor: state => state.isValid ? colors.lightgreen : colors.white,
        '&:hover': {
            backgroundColor: state => state.isValid ? colors.lightgreen : colors.green,
        },
    },
    profileCard: {
        display: 'flex',
       /*  minHeight: '96%', */
        height: '96%',
        margin: '16px',
    },
    buttonText: {
        padding: '4px',
        width: '100%',
        minWidth: '90%',
    },
    stepper: {
        display: 'flex',
    },
    submitPrime: {
        margin: '16px',
        display: 'flex',
        minHeight: '10%',
        height: '81.75vh',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
    },
});

function SimplePopover(props) {
    const classes = props.classes;
    const [anchorEl, setAnchorEl] = React.useState(null);
  
    const handleClick = event => {
      setAnchorEl(event.currentTarget);
    };
  
    const handleClose = () => {
      setAnchorEl(null);
    };
  
    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;
  
    return (
      <div>
        <Button aria-describedby={id} variant="contained" color="primary" onClick={handleClick}>
          Open Popover
        </Button>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Typography>The content of the Popover.</Typography>
        </Popover>
      </div>
    );
}


class InnerList extends PureComponent {
    shouldComponentUpdate(nextProps) {
        if(
            nextProps.column === this.props.column &&
            nextProps.itemMap === this.props.itemMap &&
            nextProps.index === this.props.index
        ) {
            return false;
        }
        return true;
    }

    render() {
        const { 
            column, 
            itemMap, 
            index, 
            isDropDisabled, 
            boardItems, 
            handleUndo, 
            handleAdd,
            handleDelete,
            handleBoardSubmit, 
            isValid,
        } = this.props;
        const items = column.itemIds.map(itemId => itemMap[itemId]);
        switch(column.id){
            case 'start':
                return null;
            default:
                return  <Column 
                            key={column.id} 
                            column={column} 
                            items={items} 
                            isDropDisabled={isDropDisabled} 
                            boardItems={boardItems}
                            handleUndo={handleUndo}
                            handleAdd={handleAdd}
                            handleDelete={handleDelete}
                            assetMap={this.props.assetMap}
                            expirationMap={this.props.expirationMap}
                            handleBoardSubmit={handleBoardSubmit}
                            isValid={isValid}
                            isOnBoard={this.props.isOnBoard}
                        />;
        }
    }
}

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
        this.createSlate = this.createSlate.bind(this);
        this.getAccount = this.getAccount.bind(this);
        this.getNetwork = this.getNetwork.bind(this);
        this.getTokenAddress = this.getTokenAddress.bind(this);
        this.handleApprove = this.handleApprove.bind(this);
        this.getContractInstance = this.getContractInstance.bind(this);
        this.isValid = this.isValid.bind(this);
        this.goToPrime = this.goToPrime.bind(this);
        this.isOnBoard = this.isOnBoard.bind(this);
        this.checkStep = this.checkStep.bind(this);
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

    onDragStart = start => {

    };

    onDragUpdate = () => {

    };

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
        this.setState(newState);

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
            console.log(item)
            switch(item) {
                case 'asset':
                    let dest = destination.droppableId;
                    console.log(dest)
                    if(dest === 'collateralBoard'){
                        (collateralItems).push(draggableId);
                        console.log(collateralItems)
                    } else {
                        (paymentItems).push(draggableId);
                        console.log(paymentItems)
                    }
                break;
                case 'expiration':
                    (expirationItems).push(draggableId);
                    console.log({expirationItems})
                    break;
                case 'address':
                    (addressItems).push(draggableId);
                    console.log({addressItems})
                    break;
                default:
                    return null;
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
            
        });

        this.isValid();
        console.timeEnd('onDragEnd');
    };

    isValid = () => {
        // GETS BOARD STATE AND RETURNS VALID IF FILLED
        let assets = 0;
        let addresses = 0;
        let expirations = 0;
        let boards = this.state.columnOrder.slice(1, 10)
        let columns = this.state.columns;
        let boardItems = this.state.boardItems ? this.state.boardItems : [];
        let collateralItems = this.state.collateralItems ? this.state.collateralItems : [];
        let paymentItems = this.state.paymentItems ? this.state.paymentItems : [];
        let expirationItems = this.state.expirationItems ? this.state.expirationItems : [];
        let addressItems = this.state.addressItems ? this.state.addressItems : [];
        let boardArray = [collateralItems, paymentItems, expirationItems, addressItems]
        console.log(boardArray)
        /* if(typeof this.state.boardItems !== 'undefined') {
            let board = this.state.boardItems;
            for(var i = 0; i < board.length; i++) {
                let boardItem = (board[i]).split('-')[0];
                switch(boardItem) {
                    case 'asset':
                        assets++;
                        break;
                    case 'expiration':
                        expirations++;
                        break;
                    case 'address':
                        addresses++;
                        break;
                }
            }
        } */

            for(var i = 0; i < boardArray.length; i++) {
                /* console.log(`BOARD`, i, columns[boards[i]].itemIds) */
                for(var x = 0; x < (boardArray[i]).length; x++) {
                    /* console.log('BOARD 2', columns[boards[i]], columns[boards[i]].itemIds) */
                    let board = (boardArray[i])[x];
                    let boardItem = (board).split('-')[0];
                    console.log(board, boardItem, i , x)
                    switch(boardItem) {
                        case 'asset':
                            assets++;
                            break;
                        case 'expiration':
                            expirations++;
                            break;
                        case 'address':
                            addresses++;
                            break;
                    }
                }
            }
        

        if(assets === 2 && addresses === 1 && expirations === 1) {
            this.setState({
                isValid: true,
            });
            console.log('VALID BOARD DETECTED:', this.state.boardItems);
        } else {
            console.log('BOARD NOT VALID', this.state.boardItems, {assets}, {addresses}, {expirations});
            this.setState({
                isValid: false,
            });
        }
    }

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

    handleUndo = (itemId, columnId) => {
        console.time('handleUndo');
        // RETURN ITEM TO ORIGINAL POSITION
        let currentIndex = columnId;
        let initialIndex = this.state.items[itemId].index;

        if(currentIndex === initialIndex) {
            return;
        }

        const start = this.state.columns[columnId];
        const finish = this.state.columns[initialIndex];

        const startItemIds = Array.from(start.itemIds);
        startItemIds.splice(startItemIds.indexOf(itemId), 1);
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };

        const finishItemIds = Array.from(finish.itemIds);
        finishItemIds.push(itemId)
        const newFinish = {
            ...finish,
            itemIds: finishItemIds,
        };

        let boardItems = this.state.boardItems ? this.state.boardItems : [];
        boardItems.splice(boardItems.indexOf(itemId), 1);

        const newState = {
            ...this.state,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
                [newFinish.id]: newFinish,
            },
        };
        this.setState(newState);

        this.isValid();
        console.timeEnd('handleUndo');
    };

    handleDelete = (itemId, columnId) => {
        console.time('handleDelete');
        // DELETE ITEM
        let currentIndex = columnId;

        const start = this.state.columns[columnId];

        const startItemIds = Array.from(start.itemIds);
        startItemIds.splice(startItemIds.indexOf(itemId), 1);
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };


        let boardItems = this.state.boardItems ? this.state.boardItems : [];
        boardItems.splice(boardItems.indexOf(itemId), 1);

        const newState = {
            ...this.state,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
            },
        };
        this.setState(newState);

        this.isValid();
        console.timeEnd('handleDelete');
    };

    handleAdd = (itemId, columnId, address) => {
        console.time('handleAdd');
        if(this.isValid()) {
            return;
        }
        let currentIndex = columnId;

        const start = this.state.columns[columnId];

        const startItemIds = Array.from(start.itemIds);
        const items = this.state.items;

        // IF ITEM IS IN COLUMN, DONT ADD ANOTHER
        if(columnId === 'addressBoard') {
            const newAddress = {
                'newAddress': {
                    id: `address-${address}`,
                    content: address,
                    type: 'address',
                    index: '',
                    payload: address,
                }
            }

            items[`address-${address}`] = newAddress['newAddress'];
            itemId = `address-${address}`;
        }

        startItemIds.push(items[itemId].id);
        if(this.hasDuplicates(startItemIds) || this.state.isValid) {
            return;
        }

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
        this.setState(newState);

        this.isValid();
        console.timeEnd('handleAdd');
    };
    
    handleBoardSubmit = async () => {
        console.time('handleBoardSubmit');
        console.log('HANDLE BOARD SUBMIT', this.state.boardItems)
        // GET BOARD STATE AND LOAD INTO PAYLOAD FOR ETHEREUM TX
        const boardIds = this.state.boardItems;
        const payloadArray = [];
        const cAssetIndex = 0;
        const pAssetIndex = 1;
        let collateralAsset;
        let paymentAsset;
        let addressReceiver;
        let expirationDate;
        
        /* for(var i = 0; i < boardIds.length; i++) {
            const payload = this.state.items[(boardIds[i])].payload;
            let type = this.state.items[(boardIds[i])].type;
            if(type === 'asset') {
                let collateralColumn = (this.state.columns['collateralBoard'].itemIds.indexOf(boardIds[i]) === 0) ? true : false;
                switch(collateralColumn) {
                    case true:
                        type = 'collateralAsset';
                        break;
                    default:
                        type = 'paymentAsset';
                }
            }
            if(payload) {
                payloadArray.push([type, payload]);
            }
        } */

        let collateralBoard;
        let paymentBoard;
        let expirationBoard;
        let addressBoard;
        for(var i = 0; i < boardIds.length; i++) {
            const payload = this.state.items[(boardIds[i])].payload;
            let type = this.state.items[(boardIds[i])].type;

            switch(type) {
                case 'asset':
                    let collateralColumn = (this.state.columns['collateralBoard'].itemIds.indexOf(boardIds[i]) === 0) ? true : false;
                    switch(collateralColumn) {
                        case true:
                            type = 'collateralAsset';
                            break;
                        default:
                            type = 'paymentAsset';
                    }
                    if(payload) {
                        payloadArray.push([type, payload]);
                    }
                case 'expiration':
                    let expirationColumn = (this.state.columns['expirationBoard'].itemIds.indexOf(boardIds[i]) === 0) ? true : false;
                    switch(expirationColumn) {
                        case true:
                            type = 'expiration';
                            break;
                        default:
                            type = 'Not Found';
                    }
                    if(payload) {
                        payloadArray.push([type, payload]);
                    }
                case 'address':
                    let addressColumn = (this.state.columns['addressBoard'].itemIds.indexOf(boardIds[i]) === 0) ? true : false;
                    switch(addressColumn) {
                        case true:
                            type = 'address';
                            break;
                        default:
                            type = 'Not Found';
                    }
                    if(payload) {
                        payloadArray.push([type, payload]);
                    }
                default:
                    console.log('not found')
            }

            if(type === 'asset') {
                /* type = boardIds.indexOf(this.state.items[(boardIds[i])].id); */
                let collateralColumn = (this.state.columns['collateralBoard'].itemIds.indexOf(boardIds[i]) === 0) ? true : false;
                switch(collateralColumn) {
                    case true:
                        type = 'collateralAsset';
                        break;
                    default:
                        type = 'paymentAsset';
                }
            }


            if(payload) {
                payloadArray.push([type, payload]);
            }
        }


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

        
        
        try {
            await this.createSlate(
                collateralAsset,
                paymentAsset,
                addressReceiver,
                expirationDate,
            );
        } catch(error) {
            console.log({error})
        }
        
        console.trace({collateralAsset, paymentAsset, addressReceiver, expirationDate, })
        this.isValid();
        console.timeEnd('handleBoardSubmit');
    };

    isOnBoard = (itemId) => {
        const boardIds = (this.state.boardItems) ? (this.state.boardItems) : [];
        if(boardIds.indexOf(itemId) !== -1) {
            console.log('ON BOARD', itemId)
            return true;
        } else {
            return false;
        }
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

    createSlate = async (
            collateralAsset, 
            paymentAsset, 
            addressReceiver, 
            expirationDate
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
        let uInstance = await this.getContractInstance(Underlying);
        let sInstance = await this.getContractInstance(Strike);


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
                uInstance, 
                primeAddress, 
                DEFAULT_AMOUNT_WEI, 
                account
            );

            const _xis = DEFAULT_AMOUNT_WEI;
            const _yak = this.getTokenAddress(networkId, collateralAsset);
            const _zed = DEFAULT_AMOUNT_WEI;
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
            let result = await primeInstance.methods.createSlate(
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
                createSlateTx: result,
            });
            console.trace({result});
        }
        console.timeEnd('createSlate');
    };

    goToPrime = () => {
        this.setState({
            inventoryPage: !this.state.inventoryPage,
        });
    };

    checkStep = () => {
        let step = (this.state.step) ? this.state.step : 0;
        let itemId = this.state.columns['board'].itemIds[step];
        if(
            this.isOnBoard(itemId) 
            && this.state.items[itemId].type === 'asset'
            && this.state.columns['board'].itemIds[0] === itemId
        ) {
            this.setState({
                step: 1,
            });
            step = 1;
            console.log('set step to 1')
        };

        if(
            this.isOnBoard(itemId) 
            && this.state.items[itemId].type === 'asset'
            && this.state.columns['board'].itemIds[0] !== itemId
        ) {
            this.setState({
                step: 2,
            });
            step = 2;
            console.log('set step to 2')
        };

        if(
            this.isOnBoard(itemId) 
            && this.state.items[itemId].type === 'expiration'
            && this.state.columns['board'].itemIds[step - 1] !== itemId
        ) {
            this.setState({
                step: 3,
            });
            step = 3;
            console.log('set step to 3')
        };

        if(
            this.isOnBoard(itemId) 
            && this.state.items[itemId].type === 'address'
            && this.state.columns['board'].itemIds[step - 1] !== itemId
        ) {
            this.setState({
                step: 4,
            });
            step = 4;
            console.log('set step to 4')
        };

        console.log(this.state.step, step, 'STEP')
        return step;
    };


    render() {
        const { classes } = this.props;
        if(this.state.inventoryPage) {
            return (
                <Inventory web3={this.state.web3} goToPrime={this.goToPrime} />
            );
        }
        const primeRows = [];
        return (
            <Page key='prime'>
                <div className={classes.stepper} key='stepper'>
                    <HorizontalNonLinearStepper 
                        checkStep={this.checkStep}
                    />
                </div>
            <div className={classes.root} key='prime'>
                <DragDropContext 
                    onBeforeDragStart={this.onBeforeDragStart}
                    onDragStart={this.onDragStart}
                    onDragEnd={this.onDragEnd}
                >
                    

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

                    <Box className={classes.cells}>
                        {this.state.columnOrder.map((columnId, index) => {
                            const column = this.state.columns[columnId];
                            return (
                                <InnerList
                                    key={column.id}
                                    column={column}
                                    itemMap={this.state.items}
                                    index={index}
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
                            );
                        })}
                    </Box>
                </DragDropContext>
                <Card className={classes.submitPrime}>
                    <Button 
                        className={classes.submitButton}
                        disabled={(this.state.isValid) ? false : true}
                        onClick={ () => {this.handleBoardSubmit()}} 
                    >
                        <Typography>
                            Create Prime
                        </Typography>
                    </Button>
                </Card>
                <LinkM 
                    href={`/inventory/${this.state.account}`}
                    underline='none'
                    className={classes.transitionButton} 
                >
                    <Button 
                        className={classes.transitionButton} 
                    >
                        <Typography className={classes.buttonText}>
                            Next Page{<ArrowRightIcon />}
                        </Typography>
                    </Button>
                </LinkM>
            </div>
            </Page>
        );
    };
};

export default (withRouter(withStyles(styles)(Prime)));