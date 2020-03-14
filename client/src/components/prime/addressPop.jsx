import React from 'react';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Popover from '@material-ui/core/Popover';

function AddressPop(props) {
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
            <Button aria-describedby={id} className={classes.addressButton} onClick={handleClick}>
                Address
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
            <Typography>{props.address}</Typography>
        </Popover>
      </div>
    );
};

export default AddressPop;