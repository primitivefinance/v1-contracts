import React, { Component } from 'react';
import { colors } from '../../theme/theme';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';


const styles = theme => ({
    primeTable: {
        color: colors.primary,
        backgroundColor: colors.banner,
        textTransform: 'uppercase',
    },
    primeInventory: {
        alignItems: '',
        color: colors.primary,
        backgroundColor: colors.banner,
        width: '50%',
    },
    title: {
        padding: '24px',
        paddingBottom: '0px',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '24px'
        },
        color: colors.primary,
    },
    address: {
        textOverflow: 'ellipsis',
        size: 'small',
        maxWidth: '0%',
        width: '0%',
        minWidth: '0%',
        color: colors.primary,
        backgroundColor: colors.banner,
    },
    addressButton: {
        backgroundColor: colors.secondary,
        color: colors.banner,
        '&:hover': {
            backgroundColor: colors.primary,
        },
    },

    coreHeader: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        backgroundColor: colors.bannerTitle ,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
    },

    coreHeaderTypography: {
        width: '33.33%',
        textAlign: 'center',
    },
    
});




class OptionsChainTableV2 extends Component {
    constructor(props) {
        super(props);
    }

    render () {
        const { classes } = this.props;

        const callColumn = this.props.callColumn;
        const putColumn = this.props.putColumn;
        const optionCallRows = (callColumn['options']) ? (callColumn['options']) : [];
        const optionPutRows = (putColumn['options']) ? (putColumn['options']) : [];
        const callMatches = callColumn['matches'];
        const putMatches = putColumn['matches'];
        const callOrders = callColumn['orders'];
        const putOrders = putColumn['orders'];
        const minAsksCall = callColumn['minAsks'];
        const minAsksPut = putColumn['minAsks'];

        let expiration = (callColumn['options'][0]) ? callColumn['options'][0].expiration : '';

        let date;
        if(expiration) {
            date = new Date(expiration * 1000);
            expiration = date.toDateString();
        }
        
        return (
            <>
                {/* PRIME INVENTORY CONTAINER */}
                <Box className={classes.coreHeader}>
                    <Typography className={classes.coreHeaderTypography}>CALL</Typography>
                    <Typography className={classes.coreHeaderTypography}>OPTION CHAIN FOR {this.props.pair} {(new Date(this.props.expiration * 1000)).toDateString()} </Typography>
                    <Typography className={classes.coreHeaderTypography}>PUT</Typography>
                </Box>
                <Box style={{display: 'flex', flexDirection: 'row'}}>

                    

                    {/* CALL OPTION COLUMN */}
                    <Box className={classes.primeInventory}>

                        {/* CALL TABLE */}
                        <TableContainer component={Paper}>
                            <Table className={classes.primeTable} stickyHeader size='small'>

                                {/* HEAD */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center' variant={'h1'}>Underlying</TableCell>
                                        <TableCell align='center' variant={'h1'}>Bid</TableCell>
                                        <TableCell align='center' variant={'h1'}>Ask</TableCell>
                                        <TableCell align='center' variant={'h1'}>Qty</TableCell>
                                        <TableCell align='center' variant={'h1'}>Strike</TableCell>
                                    </TableRow>
                                </TableHead>
                                
                                {/* BODY */}
                                <TableBody>
                                    {optionCallRows.map(option => (
                                        <TableRow 
                                            hover 
                                            key={option.name}  
                                            style={{ cursor: 'pointer' }} 
                                            onClick={
                                                () => {
                                                    this.props.handleOptionSelect(
                                                        'call', 
                                                        option.chain, 
                                                        option.expiration, 
                                                        callOrders, 
                                                        option, 
                                                        callMatches[option.index],
                                                    )
                                                }
                                            }
                                        >
                                            <TableCell align='center' variant={'h1'}>{option.collateralAmt} {option.collateralSym}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{option.bid}</TableCell>
                                            <TableCell align='center' variant={'h1'}>
                                                {
                                                    (minAsksCall[option.index] && minAsksCall[option.index] !== NaN) 
                                                        ? (minAsksCall[option.index] / 10**18 + ' ETH')
                                                            : '-'
                                                } 
                                            </TableCell>
                                            <TableCell align='center' variant={'h1'}>{callMatches[option.index].length}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{option.strikeAmt} {option.strikeSym}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                
                            </Table>
                        </TableContainer>

                        

                    </Box>

                    {/* CALL OPTION COLUMN */}
                    <Box className={classes.primeInventory}>

                        {/* PUT TABLE */}
                        <TableContainer component={Paper}>
                            <Table className={classes.primeTable} stickyHeader size='small'>

                                {/* HEAD */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center' variant={'h1'}>Underlying</TableCell>
                                        <TableCell align='center' variant={'h1'}>Bid</TableCell>
                                        <TableCell align='center' variant={'h1'}>Ask</TableCell>
                                        <TableCell align='center' variant={'h1'}>Qty</TableCell>
                                        <TableCell align='center' variant={'h1'}>Strike</TableCell>
                                    </TableRow>
                                </TableHead>
                                
                                {/* BODY */}
                                <TableBody>
                                    {optionPutRows.map(option => (
                                        <TableRow 
                                            hover 
                                            key={option.name} 
                                            style={{ cursor: 'pointer', }} 
                                            onClick={
                                                () => {
                                                    this.props.handleOptionSelect(
                                                        'put', 
                                                        option.chain, 
                                                        option.expiration, 
                                                        putOrders, 
                                                        option, 
                                                        putMatches[option.index],
                                                    )
                                                }
                                            }
                                        >
                                            <TableCell align='center' variant={'h1'}>{option.collateralAmt} {option.collateralSym}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{option.bid}</TableCell>
                                            <TableCell align='center' variant={'h1'}>
                                                {
                                                    (minAsksPut[option.index] && minAsksPut[option.index] !== NaN)
                                                    ? (minAsksPut[option.index] / 10**18 + ' ETH')
                                                            : '-'
                                                } 
                                            </TableCell>
                                            <TableCell align='center' variant={'h1'}>{putMatches[option.index].length}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{option.strikeAmt} {option.strikeSym}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                
                            </Table>
                        </TableContainer>

                    </Box>

                </Box>
            </>
        );
    };
};

export default withStyles(styles)(OptionsChainTableV2);