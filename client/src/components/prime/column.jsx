import React, { Component, PureComponent } from 'react';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import { 
    Card,
    Typography,
    Grid,
    Box,
    IconButton,
    Button,
    InputBase,
} from '@material-ui/core';
import { Droppable } from 'react-beautiful-dnd';
import Item from './item';
import Asset from './asset';
import Expiration from './expiration';
import Address from './address';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';





const styles = theme => ({
    board: {
        flex: 1,
        display: 'flex',
        minHeight: '25vh',
        margin: '16px',
        flexDirection: 'column',
        transition: 'background-color 0.25s linear',
    },
    list: {
        flexGrow: 1,
        padding: '16px',
        minHeight: '10vh',
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
        }
    },
    title: {
        display: 'flex',
        padding: '16px',
        paddingBottom: '0px',
        justifyContent: 'center',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '8px'
        }
    },
    iconButton: {
        color: colors.green,
        backgroundColor: 'transparent',
        opacity: '100%',
        '&:hover': {
            color: colors.lightgreen,
            backgroundColor: 'transparent',
        },
        borderRadius: '0%',
    },
    select: {
        display: 'flex',
        width: '100%',
    },
    formControl: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        '&:hover': {
            backgroundColor: colors.lightblue,
        },
        border: '0px',
    },
    inputLabel: {
        bottomBorder: '0px',
        variant: 'outlined',
    },
    menuItem: {
        backgroundColor: props => props.isDuplicate ? colors.palered : colors.lightblue
    }
});


function FormDiaglogue(props) {
    const [open, setOpen] = React.useState(false);
    const [itemId, setItemId] = React.useState('');
    const [address, setAddress] = React.useState('');
    const assets = props.assetMap; // all assets
    const expirations = props.expirationMap; // all expirations
    const items = props.items; // items in column
    const assetIds = assets['assetIds'];
    const expirationIds = expirations['expirationIds'];
    const inactiveAssets = [];
    
    
    function hasDuplicates(array) {
        var valuesSoFar = Object.create(null);
        for (var i = 0; i < array.length; ++i) {
            var value = array[i];
            if (value in valuesSoFar) {
                console.log('DUPLICATES FOUND')
                return true;
            }
            valuesSoFar[value] = true;
        }
        console.log('NO DUPLICATES FOUND')
        return false;
    }


    const handleClickOpen = () => {
      setOpen(true);
      console.log(inactiveAssets)
    };

    const handleClose = () => {
      setOpen(false);
    };

    const handleChange = event => {
        setItemId(String(event.target.value) || '');
      };

    const handleAddress = event => {
      setAddress(String(event.target.value) || '');
    };

    let selectOption;
    
    let isDuplicate = false;
    switch(props.columnId) {
        case 'asset':
            // LOGIC FOR CONDITIONAL CSS - FIX LATER
            /* const combinedArray = [];
            for(var i = 0; i < items.length; i++) {
                combinedArray.push((items[i]).id);
            }
            for(var i = 0; i < assetIds.length; i++) {
                combinedArray.push(assetIds[i]);
            }
            if(hasDuplicates(combinedArray)) {
                console.log(combinedArray, 'has duplicates')
            } */

            selectOption = assetIds.map((asset) => {
                return(
                    <MenuItem value={asset}>{(assets[asset]).content}</MenuItem>
                )
            });
            break;
        case 'expiration':
            selectOption = expirationIds.map((expiration) => {
                return(
                    <MenuItem 
                        value={expiration} 
                        className={props.classes.menuItem}
                    >
                        {(expirations[expiration]).content}
                    </MenuItem>
                )
            });
            break;
        case 'address':
            //selectOption = <InputBase />
            break;
    }

    let addressForm = <Input 
                        id='address-input' 
                        value={address}
                        onChange={handleAddress}
                        input={<Input/>}
                      />;
                      
    let selectForm = <Select
                      value={itemId}
                      onChange={handleChange}
                      input={<Input />}
                      className={props.classes.select}
                      placeholder="ERC-20"
                      variant='outlined'
                    >  
                      {selectOption}
                    </Select>;


    return (
        <div>
            <IconButton
                    color='primary'
                    onClick={handleClickOpen}
                    className={props.classes.iconButton}
            >
                <AddCircleIcon />
            </IconButton>
            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Add an {(props.columnId).charAt(0).toUpperCase() + (props.columnId).slice(1)}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                    {(props.columnId === 'address') ? 'Enter a valid Ethereum Address' : 'Choose from the available options.'}
                      
                    </DialogContentText>
                    <FormControl className={`${props.classes.formControl} ${props.classes.inputLabel}`}>
                      {(props.columnId === 'address') ? addressForm : selectForm}
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                      Cancel
                    </Button>
                    <Button
                        onClick={ () => {
                            props.handleAddForm(itemId, props.columnId, address); 
                            handleClose();
                        }} 
                        color="primary"
                    >
                      Add
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}


class InnerList extends PureComponent {
    shouldComponentUpdate(nextProps) {
        if(nextProps.items === this.props.items) {
            return false;
        }
        return true;
    }

    render () {
        const { boardItems, column, handleUndo, handleDelete } = this.props;
        return (
            this.props.items.map((item, index) => {
                let _item = (item.id).split('-')[0];
                switch(_item) {
                    case 'asset':
                        return (
                            <Asset 
                                key={item.id} 
                                item={item} 
                                index={index} 
                                boardItems={boardItems}
                                column={column}
                                handleUndo={handleUndo}
                                handleDelete={handleDelete}
                            />
                        );
                        break;
                    case 'expiration':
                        return (
                            <Expiration 
                                key={item.id} 
                                item={item} 
                                index={index} 
                                boardItems={boardItems}
                                column={column}
                                handleUndo={handleUndo}
                                handleDelete={handleDelete}
                            />
                        );
                        break;
                    case 'address':
                        return (
                            <Address 
                                key={item.id} 
                                item={item} 
                                index={index} 
                                boardItems={boardItems}
                                column={column}
                                handleUndo={handleUndo}
                                handleDelete={handleDelete}
                            />
                        );
                        break;
                }
            })
        );
    }
}

class Column extends Component {
    constructor(props) {
        super(props)
        this.handleAddForm = this.handleAddForm.bind(this);
        this.handleBoardSubmit = this.handleBoardSubmit.bind(this);
    }

    handleAddForm = (symbol, columnId, address) => {
        this.props.handleAdd(symbol, columnId, address);
    }

    handleBoardSubmit = () => {
        console.log('HANDLE BOARD SUBMIT')
    }

    render() {
        const { 
            classes, 
            column, 
            handleUndo, 
            handleAdd,
            handleDelete,
        } = this.props;

        let form = <FormDiaglogue 
                    items={this.props.items}
                    columnId={column.id}
                    handleAddForm={this.handleAddForm}
                    classes={classes}
                    assetMap={this.props.assetMap}
                    expirationMap={this.props.expirationMap}
                />
        let boardForm = <Button
                            onClick={this.handleBoardSubmit}    
                            >Submit Board
                        </Button>

        return(
            <Card className={`${classes.board} ${classes.prime}`}>
                <Typography variant={'h1'} className={`${classes.title} title`}>
                    {this.props.column.title}
                </Typography>
                <Droppable 
                    droppableId={this.props.column.id}
                    isDropDisabled={this.props.isDropDisabled}
                >
                    {(provided) => (
                        <>
                        <Box
                            className={classes.list}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            <InnerList 
                                items={this.props.items}
                                boardItems={this.props.boardItems}
                                column={column}
                                handleUndo={handleUndo}
                                handleAdd={handleAdd}
                                handleDelete={handleDelete}
                            />
                            {provided.placeholder}
                        </Box>
                        </>
                    )}
                </Droppable>
                {(column.id === 'board') ? boardForm : form}
                {/* <FormDiaglogue 
                    items={this.props.items}
                    columnId={column.id}
                    handleAddForm={this.handleAddForm}
                    classes={classes}
                    assetMap={this.props.assetMap}
                    expirationMap={this.props.expirationMap}
                /> */}
            </Card>
        );
    }
}

export default withStyles(styles)(Column);