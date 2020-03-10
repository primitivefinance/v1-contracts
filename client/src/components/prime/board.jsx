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
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Asset from './asset';
import Expiration from './expiration';
import Address from './address';
import Board from './board';


const styles = theme => ({
    board: {
        display: 'flex',
        margin: '16px',
        marginRight: '32px',
        width: '20%',
        height: '20%',
        minWidth: '10%',
        minHeight: '10%',
        flexDirection: 'row',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
        borderRadius: '0px',
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
    },
    prime: {
        backgroundColor: colors.banner,
        '&:hover': {
            backgroundColor: colors.highlight,
            '& .title': {
                color: colors.primary
            },
            '& .icon': {
                color: colors.primary
            },
        },
        '& .title': {
            color: colors.primary,
            fontWeight: '600',
        },
        '& .icon': {
            color: colors.primary
        }
    },
    title: {
        display: 'flex',
        padding: '16px',
        paddingBottom: '0px',
        justifyContent: 'center',
        fontWeight: '600',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '8px'
        },
        backgroundColor: colors.banner,
    },
    iconButton: {
        color: colors.success,
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
        color: colors.primary,
    },
    inputLabel: {
        bottomBorder: '0px',
    },
    menuItem: {
        backgroundColor: props => props.isDuplicate ? colors.palered : colors.lightblue,
        color: colors.primary,
        backgroundColor: colors.background,
        '&:hover': {
            color: colors.primary,
            backgroundColor: colors.background,
        },

        
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
    miniBoard: {
        flex: 1,
        display: 'flex',
        minHeight: '20vh',
        margin: '4px',
        flexDirection: 'column',
        transition: 'background-color 0.25s linear',
    },
    addButtons: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        backgroundColor: colors.banner,
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
    const name = props.name;
    
    
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
    switch(props.name) {
        case 'asset':
            selectOption = assetIds.map((asset) => {
                return(
                    <MenuItem className={props.classes.menuItem} value={asset}>{(assets[asset]).content} </MenuItem>
                )
            });
            break;
        case 'expiration':
            selectOption = expirationIds.map((expiration) => {
                const timestamp = (expirations[expiration]).content;
                const date = (new Date(timestamp * 1000))
                const datetime = ((date.toDateString() + ' ' + date.toTimeString()).split('G'))[0];
                return(
                    <MenuItem 
                        value={expiration} 
                        className={props.classes.menuItem}
                    >
                        {datetime}
                    </MenuItem>
                )
            });
            break;
        case 'address':
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
        <>
            <IconButton
                    color='primary'
                    onClick={handleClickOpen}
                    className={props.classes.iconButton}
            >
                <AddCircleIcon />
            </IconButton>
            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title" color='primary' style={{color: colors.primary}}>Add {props.name}</DialogTitle>
                <DialogContent>
                    <DialogContentText style={{color: colors.primary}}>
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
                            props.handleAddForm(itemId, 'start', address); 
                            handleClose();
                        }} 
                        color="primary"
                    >
                      Add
                    </Button>
                </DialogActions>
            </Dialog>
        </>
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
        } = this.props;

        let assetForm = <FormDiaglogue
                    items={items}
                    columnId={'start'}
                    name={'asset'}
                    handleAddForm={this.handleAddForm}
                    classes={classes}
                    assetMap={assetMap}
                    expirationMap={expirationMap}
                />
        let expirationForm = <FormDiaglogue
                items={items}
                columnId={'start'}
                name={'expiration'}
                handleAddForm={this.handleAddForm}
                classes={classes}
                assetMap={assetMap}
                expirationMap={expirationMap}
            />
        let addressForm = <FormDiaglogue
                items={items}
                columnId={'address'}
                name={'address'}
                handleAddForm={this.handleAddForm}
                classes={classes}
                assetMap={assetMap}
                expirationMap={expirationMap}
            />

        return(
            <Card className={
                (column.id === 'start') 
                    ? `${classes.txBoard} ${classes.board} ${classes.prime}` 
                        : `${classes.board} ${classes.prime}`
                }>
            <Typography variant={'h1'} className={`${classes.title} title`}>
                {column.title}
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
            <Box className={classes.addButtons}>
                {assetForm}
                {expirationForm}
                {addressForm}
            </Box>
        </Card>
        );
    }
}

export default withStyles(styles)(Column);