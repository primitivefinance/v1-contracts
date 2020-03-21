import React, { Component } from 'react';
import { colors } from '../../theme/theme';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import AddressPop from './addressPop';


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

        const chain = callColumn['chain'];
        const expiration = (callColumn['options'][0]) ? callColumn['options'][0].expiration : '';

        let ask = 0;
        let minAsks = {
            'call': {},
            'put': {},
        };

        /* FOR EACH OPTION IN THE INITIAL STATE, GET MATCHING TOKENS AND ORDERS */
        for(var i = 0; i < putColumn['options'].length; i++) {
            let orders = putOrders['sell'];
            let matches = putMatches[i];
            ask = 0;
            /* FOR EACH OBJECT, GET THE ASK, THEN KEEP THE LOWEST ASK*/
            for(var x = 0; x < matches.length; x++) {
                let objAsk = orders[matches[x]];
                if(ask == 0) {
                    ask = objAsk;
                } else if (objAsk < ask && objAsk !== 0) {
                    ask = objAsk;
                };
            }
            minAsks['put'][i] = ask;
            /* console.log('PUT ASKS', {putMatches},  orders, {ask, i}) */
        }

        for(var i = 0; i < callColumn['options'].length; i++) {
            let orders = callOrders['sell'];
            let matches = callMatches[i];
            ask = 0;
            /* FOR EACH OBJECT, GET THE ASK, THEN KEEP THE LOWEST ASK*/
            for(var x = 0; x < matches.length; x++) {
                let objAsk = orders[matches[x]];
                if(ask == 0) {
                    ask = objAsk;
                } else if (objAsk < ask && objAsk !== 0) {
                    ask = objAsk;
                };
            }
            minAsks['call'][i] = ask;
            /* console.log('CALL ASKS', {callMatches}, callMatches[i][0], callOrders['sell'], {ask, i}) */
        }

        
        return (
            <>
                {/* PRIME INVENTORY CONTAINER */}
                <Box style={{display: 'flex', flexDirection: 'row'}}>

                    {/* CALL OPTION COLUMN */}
                    <Card className={classes.primeInventory}>

                        {/* CALL TABLE */}
                        <TableContainer component={Paper}>
                            <Table className={classes.primeTable}>

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
                                            style={{ cursor: 'pointer', }} 
                                            onClick={
                                                () => {
                                                    this.props.handleOptionSelect(
                                                        'call', 
                                                        chain, 
                                                        expiration, 
                                                        callOrders, 
                                                        option, 
                                                        callMatches[option.index],
                                                    )
                                                }
                                            }
                                        >
                                            <TableCell align='center' variant={'h1'}>{option.collateral} {option.collateralUnits}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{option.bid}</TableCell>
                                            <TableCell align='center' variant={'h1'}>
                                                {
                                                    (minAsks['call'][option.index]) 
                                                        ? (minAsks['call'][option.index] / 10**18 + ' ETH')
                                                            : '-'
                                                } 
                                            </TableCell>
                                            <TableCell align='center' variant={'h1'}>{callMatches[option.index].length}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{option.strike} {option.strikeUnits}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                
                            </Table>
                        </TableContainer>

                        

                    </Card>

                    {/* CALL OPTION COLUMN */}
                    <Card className={classes.primeInventory}>

                        {/* PUT TABLE */}
                        <TableContainer component={Paper}>
                            <Table className={classes.primeTable}>

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
                                                        chain, 
                                                        expiration, 
                                                        putOrders, 
                                                        option, 
                                                        putMatches[option.index],
                                                    )
                                                }
                                            }
                                        >
                                            <TableCell align='center' variant={'h1'}>{option.collateral} {option.collateralUnits}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{option.bid}</TableCell>
                                            <TableCell align='center' variant={'h1'}>
                                                {
                                                    (minAsks['put'][option.index])
                                                    ? (minAsks['put'][option.index] / 10**18 + ' ETH')
                                                            : '-'
                                                } 
                                            </TableCell>
                                            <TableCell align='center' variant={'h1'}>{putMatches[option.index].length}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{option.strike} {option.strikeUnits}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                
                            </Table>
                        </TableContainer>

                    </Card>

                </Box>
            </>
        );
    };
};

export default withStyles(styles)(OptionsChainTableV2);