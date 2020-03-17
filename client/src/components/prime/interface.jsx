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
import Link from '@material-ui/core/Link';
import CustomizedExpansionPanels from './expansionPanel';
import Chart from './chart';

const RINKEBY_ETHERSCAN_BASE_URL = 'https://rinkeby.etherscan.io/';
const RINKEBY_PRIME_ADDRESS = '0x2d77b1d0ff56f6c0ba59a8993f58823d68285e0f';


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
        },
        backgroundColor: colors.banner,
        color: colors.primary,
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
        backgroundColor: colors.banner,
        color: colors.primary,
    },
    address: {
        textOverflow: 'ellipsis',
        size: 'small',
        maxWidth: '0%',
        width: '0%',
        minWidth: '0%',

    },
    interface: {
        backgroundColor: colors.banner,
        color: colors.primary,
        letterSpacing: '1px',
        textTransform: 'uppercase',
    },
    container: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '90%',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
        backgroundColor: colors.banner,
        color: colors.primary,
    },
    actionButtons: {
        backgroundColor: colors.lightblue,
        '&:hover': {
            backgroundColor: colors.green,
        },
    },
    etherscanLink: {
        '&:hover': {
            color: colors.success,
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
        let statsData = (this.props.statsData) ? (this.props.statsData) : undefined;
        let tCV;
        let tPV;
        let tNV;
        let hNV;
        let hID
        if(typeof statsData !== 'undefined') {
            tCV = this.props.statsData['tCV'];
            tPV = this.props.statsData['tPV'];
            tNV = this.props.statsData['tNV'];
            hNV = this.props.statsData['hNV'];
            hID = this.props.statsData['hID'];
        };
        return (
            <div className={classes.container} key='interface'>
                <Typography className={classes.title} variant={'h1'}>
                    YOUR ACTIVE PRIME ERC-721 NFT TOKENS
                </Typography>
                <Grid className={classes.interface}>
                        <Grid item>
                            
                            <Card className={classes.interface}>

                                <TableContainer component={Card}>
                                    <Table className={classes.interface}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell align='left' variant={'h1'}>ID</TableCell>
                                                <TableCell align='left' variant={'h1'}>Collateral</TableCell>
                                                <TableCell align='left' variant={'h1'}>Payment</TableCell>
                                                <TableCell align='left' variant={'h1'}>Net</TableCell>
                                                <TableCell align='left' variant={'h1'}>Exercise</TableCell>
                                                <TableCell align='left' variant={'h1'}>Withdraw</TableCell>
                                                <TableCell align='left' variant={'h1'}>Position</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {primeRows.map(row => (
                                                <TableRow key={row.name}>
                                                    <TableCell align='left' variant={'h1'}>
                                                        SP # [
                                                                <Link 
                                                                    href={`${RINKEBY_ETHERSCAN_BASE_URL}/token/${RINKEBY_PRIME_ADDRESS}/?a=${row.tokenId}`}
                                                                    className={classes.etherscanLink}
                                                                    underline='none'
                                                                >
                                                                    {row.tokenId}
                                                                </Link>]
                                                    </TableCell>
                                                    <TableCell align='left' variant={'h1'}> 
                                                        $ {(typeof statsData !== 'undefined') ? statsData['tokenValues'][row.tokenId]['cV'] : 'n/a'}
                                                    </TableCell>
                                                    <TableCell align='left' variant={'h1'}> 
                                                        $ {(typeof statsData !== 'undefined') ? statsData['tokenValues'][row.tokenId]['pV'] : 'n/a'}
                                                    </TableCell>
                                                    <TableCell align='left' variant={'h1'}> 
                                                        $ {(typeof statsData !== 'undefined') ? statsData['tokenValues'][row.tokenId]['nV'] : 'n/a'}
                                                    </TableCell>
                                                    <TableCell align='left' variant={'h1'}>
                                                        <Button 
                                                            variant='contained' 
                                                            className={classes.actionButtons}
                                                            onClick={() => this.props.primeExercise(row.tokenId)}
                                                        >
                                                            Exercise
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell align='left' variant={'h1'}>
                                                        <Button 
                                                            variant='contained' 
                                                            className={classes.actionButtons}
                                                            onClick={() => this.props.primeClose(row.tokenId)}
                                                        >
                                                            Withdraw
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell align='left' variant={'h1'}>
                                                        {row.position}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                    
                                    
                                
                                </Card>
                                
                        </Grid>

                        <Grid item>
                            <Chart
                                statsData={this.props.statsData}
                                data={this.props.data}
                            />
                        </Grid>


                    </Grid>
            </div>
        );
    };
};

export default withStyles(styles)(Interface);