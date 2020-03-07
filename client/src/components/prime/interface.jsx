import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import Popover from '@material-ui/core/Popover';
import Button from '@material-ui/core/Button';

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
            flexDirection: 'column',
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
    address: {
        textOverflow: 'ellipsis',
        size: 'small',
        maxWidth: '0%',
        width: '0%',
        minWidth: '0%',

    },
    interface: {
        display: 'flex',
        flexDirection: 'column',
    },
    container: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '90%',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        }
    },
    actionButtons: {
        backgroundColor: colors.lightblue,
        '&:hover': {
            backgroundColor: colors.green,
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
        <Button aria-describedby={id} variant="contained" onClick={handleClick}>
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
}


class Interface extends Component {
    constructor(props) {
        super(props);

    }

    componentDidMount = async () => {
    };

    render () {
        const { classes } = this.props;
        const primeRows = this.props.primeRows;
        return (
            <div className={classes.container} key='interface'>
                <Typography className={classes.title}>
                    PRIME ERC-721 NFT TOKENS
                </Typography>
                <Grid className={classes.interface}>
                        <Grid item className={classes.interface}>
                                <TableContainer component={Paper}>
                                    <Table >
                                        <TableHead>
                                            <TableRow>
                                                <TableCell align='right'>ID</TableCell>
                                                <TableCell align='right'>Exercise</TableCell>
                                                <TableCell align='right'>Withdraw</TableCell>
                                                <TableCell align='right'>Create Another</TableCell>
                                                <TableCell align='right' className={this.props.classes.address}>Paid To</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {primeRows.map(row => (
                                                <TableRow key={row.name}>
                                                    <TableCell align='right'>{row.tokenId}</TableCell>
                                                    <TableCell align='right'>
                                                        <Button 
                                                            variant='contained' 
                                                            className={classes.actionButtons}
                                                            onClick={() => this.props.primeExercise(row.tokenId)}
                                                        >
                                                            Exercise
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell align='right'>
                                                        <Button 
                                                            variant='contained' 
                                                            className={classes.actionButtons}
                                                            onClick={() => this.props.primeClose(row.tokenId)}
                                                        >
                                                            Withdraw
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell align='right'>
                                                        <Button variant='contained' className={classes.actionButtons}>
                                                            Create
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell align='right' className={this.props.classes.address}>
                                                        <SimplePopover address={row.gem}/>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                        </Grid>
                    </Grid>
            </div>
        );
    };
};

export default withStyles(styles)(Interface);