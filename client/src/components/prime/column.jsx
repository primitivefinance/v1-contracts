import React, { Component, PureComponent } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Box from '@material-ui/core/Box';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Asset from './asset';
import Expiration from './expiration';
import Address from './address';
import TextField from '@material-ui/core/TextField';



const styles = theme => ({
    board: {
        display: 'flex',
        margin: '16px',
        width: '90%',
        height: '30%',
        minWidth: '10%',
        minHeight: '10%',
        flexWrap: 'wrap',
        flexDirection: 'row',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
            width: '30%',
        },
    },
    list: {
        padding: '16px',
        minHeight: '10vh',
        minWidth: '30vh',
        backgroundColor: colors.secondary,
        '&:hover': {
            backgroundColor: colors.highlight,
        },
        [theme.breakpoints.up('sm')]: {
            minWidth: '10vh',
        },
        borderColor: colors.primary,
    },
    prime: {
        backgroundColor: colors.background,
        '&:hover': {
            '& .title': {
                color: colors.primary
            },
            '& .icon': {
                color: colors.blue
            },
        },
        '& .title': {
            color: colors.primary,
            fontWeight: '600',
        },
        '& .icon': {
            color: colors.blue
        }
    },
    title: {
        padding: '16px',
        paddingBottom: '0px',
        justifyContent: 'center',
        alignItems: 'center',
        fontWeight: '500',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '8px'
        },
        backgroundColor: colors.banner,
        color: colors.primary,
        display: 'flex',
        justifyContent: 'space-evenly',
    },
    iconButton: {
        color: colors.green,
        backgroundColor: colors.grey,
        opacity: '80%',
        '&:hover': {
            color: colors.lightgreen,
            backgroundColor: 'transparent',
        },
        borderRadius: '0%',
    },
    select: {
        display: 'flex',
        width: '100%',
        backgroundColor: colors.banner,
        color: colors.primary,

    },
    formControl: {
        /* width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.banner,
        '&:hover': {
            backgroundColor: colors.banner,
        },
        color: colors.primary,
        border: '0px', */
    },
    inputLabel: {
        bottomBorder: '0px',
        variant: 'outlined',
        backgroundColor: colors.banner,
        '&:hover': {
            backgroundColor: colors.banner,
        },
        color: colors.primary,
    },
    menuItem: {
        backgroundColor: props => props.isDuplicate ? colors.palered : colors.lightblue,
        backgroundColor: colors.banner,
    },
    txBoard: {
        backgroundColor: props => props.isValid ? colors.white : colors.white,
        '&:hover': {
            backgroundColor: props => props.isValid ? colors.white : colors.white,
        },
    },
    submit: {
        backgroundColor: props => props.isValid ? colors.lightgreen : colors.white,
        '&:hover': {
            backgroundColor: props => props.isValid ? colors.lightgreen : colors.palered,
        },
    },
    amountForm: {
        display: 'flex',
        justifyContent: 'center',
    },
    mintButton: {
        backgroundColor: colors.primary,
        color: colors.banner,
        '&:hover' : {
            backgroundColor: colors.background,
            color: colors.primary,
            fontWeight: '600',
        },
        fontWeight: '500',
        height: '2%',
    },
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
    console.log('COLUMN ID', props.columnId);
    switch(props.columnId) {
        case 'collateralBoard':
            selectOption = assetIds.map((asset) => {
                return(
                    <MenuItem value={asset}>{(assets[asset]).content}</MenuItem>
                )
            });
            break;
        case 'paymentBoard':
            selectOption = assetIds.map((asset) => {
                return(
                    <MenuItem value={asset}><Typography variant={'h1'}>{(assets[asset]).content}</Typography></MenuItem>
                )
            });
            break;
        case 'expirationBoard':
            selectOption = expirationIds.map((expiration) => {
                return(
                    <MenuItem 
                        value={expiration} 
                        /* className={props.classes.menuItem} */
                    >
                        {(expirations[expiration]).content}
                    </MenuItem>
                )
            });
            break;
        case 'addressBoard':
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
                <DialogTitle id="form-dialog-title">Add a part</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                    {(props.columnId === 'addressBoard') ? 'Enter a valid Ethereum Address' : 'Choose from the available options.'}
                      
                    </DialogContentText>
                    <FormControl fullWidth component={Paper} variant='outlined' color='secondary' /* className={`${props.classes.formControl} ${props.classes.inputLabel}`} */>
                      {(props.columnId === 'addressBoard') ? addressForm : selectForm}
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

function MultilineTextFields(props) {
    const { classes } = props;
    const [value, setValue] = React.useState();
  
    const handleChange = event => {
      setValue(event.target.value);
      props.handleAssetAmount(props.columnId, value)
    };

    const handleSubmit = () => {
        props.handleAssetAmount(props.columnId, value)
    };
  
    return (
      <form className={classes.amountForm} noValidate autoComplete="off">
          <TextField
            placeholder='Amount'
            value={value}
            onChange={handleChange}
          />
          <Button 
            className={classes.mintButton}
            onSubmit={() => handleSubmit}
          >Set</Button>
    </form>
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
        const { boardItems, column, handleUndo, handleDelete, isDragDisabled } = this.props;
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
                                isOnBoard={this.props.isOnBoard}
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
                                isOnBoard={this.props.isOnBoard}
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
                                isOnBoard={this.props.isOnBoard}
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
        this.handleBoard = this.handleBoard.bind(this);
    }

    handleAddForm = (symbol, columnId, address) => {
        this.props.handleAdd(symbol, columnId, address);
    }

    handleBoard = (columnId) => {
        this.props.handleBoardSubmit(columnId);
    }

    render() {
        const { 
            classes,
            isDropDisabled,
            column, 
            handleUndo, 
            handleAdd,
            handleDelete,
            items,
            assetMap,
            expirationMap,
            boardItems,
            index
        } = this.props;

        let form = <FormDiaglogue 
                    items={items}
                    columnId={column.id}
                    handleAddForm={this.handleAddForm}
                    classes={classes}
                    assetMap={assetMap}
                    expirationMap={expirationMap}
                />
        let boardForm = <Button
                            className={classes.submit}
                            disabled={(this.props.isValid) ? false : true}
                            onClick={ () => {this.handleBoard(column.id);}}    
                            >Submit Board
                        </Button>

        let amountForm;
        if(column.id) {
            switch(column.id) {
                case 'collateralBoard':
                    amountForm = <MultilineTextFields 
                                    classes={classes}
                                    columnId={column.id}
                                    handleAssetAmount={this.props.handleAssetAmount}
                                 />
                    break;
                case 'paymentBoard':
                    amountForm = <MultilineTextFields 
                                    classes={classes}
                                    columnId={column.id}
                                    handleAssetAmount={this.props.handleAssetAmount}
                                 />
                    break;
                default:
                    amountForm = '';
                    break;
            };
        };
        return(
            <Card className={
                    (column.id === 'board') 
                        ? `${classes.txBoard} ${classes.board} ${classes.prime}` 
                            : `${classes.board} ${classes.prime}`
                    }>
                <Typography variant={'h1'} className={`${classes.title} title`}>
                    {column.title}
                    {' '}
                    {amountForm}
                    {/* <form className={classes.root} noValidate autoComplete="off">
                        <TextField 
                            id="outlined-basic" 
                            label="Outlined" 
                            variant='outlined' 
                            value={this.props.qty}
                            onChange={() => {this.props.updateQty();}}
                        />
                    </form> */}
                </Typography>
                
                <Droppable 
                    droppableId={column.id}
                    isDropDisabled={isDropDisabled}
                >
                    {(provided) => (
                        <>
                        <Box
                            className={classes.list}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            <InnerList
                                items={items}
                                boardItems={boardItems}
                                column={column}
                                handleUndo={handleUndo}
                                handleAdd={handleAdd}
                                handleDelete={handleDelete}
                                isOnBoard={this.props.isOnBoard}
                            />
                            {provided.placeholder}
                        </Box>
                        </>
                    )}
                </Droppable>
                {/* {
                    (column.id === 'board') 
                        ? boardForm 
                            : form
                } */}
            </Card>
        );
    }
}

export default withStyles(styles)(Column);