import React, { Component } from 'react';
import { colors } from '../../theme';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
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

function AddForm(props) {
    const [open, setOpen] = React.useState(false);
    const [itemId, setItemId] = React.useState('');
    const [address, setAddress] = React.useState('');
    const assets = props.assetMap;
    const expirations = props.expirationMap;
    const assetIds = assets['assetIds'];
    const expirationIds = expirations['expirationIds'];

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
                );
            });
            break;
        case 'expiration':
            selectOption = expirationIds.map((expiration) => {
                const timestamp = (expirations[expiration]).payload;
                const date = (new Date(timestamp * 1000))
                const datetime = ((date.toDateString() + ' ' + date.toTimeString()).split('G'))[0];
                return(
                    <MenuItem 
                        value={expiration} 
                        className={props.classes.menuItem}
                    >
                        {datetime}
                    </MenuItem>
                );
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
};

export default AddForm;