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




class OptionsChainTable extends Component {
    constructor(props) {
        super(props);
    }

    render () {
        const { classes } = this.props;
        const optionCallRows = (this.props.optionCallRows) ? (this.props.optionCallRows) : [];
        const optionPutRows = (this.props.optionPutRows) ? (this.props.optionPutRows) : [];
        return (
            <>
            {/* PRIME INVENTORY CONTAINER */}
            <Box style={{display: 'flex', flexDirection: 'row'}}>
                {/* <Grid item> */}
                    <Card className={classes.primeInventory}>

                        {/* PRIME TABLE */}
                        <TableContainer component={Paper}>
                            <Table className={classes.primeTable}>

                                {/* HEAD */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center' variant={'h1'}>Bid</TableCell>
                                        <TableCell align='center' variant={'h1'}>Ask</TableCell>
                                        <TableCell align='center' variant={'h1'}>Qty</TableCell>
                                        <TableCell align='center' variant={'h1'}>Strike</TableCell>
                                    </TableRow>
                                </TableHead>
                                
                                {/* BODY */}
                                <TableBody>
                                    {optionCallRows.map(row => (
                                        <TableRow hover key={row.name}  style={{ cursor: 'pointer', }} onClick={() => this.props.handleOptionSelect('call', row.tokenId, row.collateralUnits, row.strikeUnits)}>
                                            <TableCell align='center' variant={'h1'}>{row.bid}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.ask}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.qty}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.strike} {row.strikeUnits}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                
                            </Table>
                        </TableContainer>

                        

                    </Card>
                {/* </Grid>
                <Grid item> */}
                    <Card className={classes.primeInventory}>

                        {/* PRIME TABLE */}
                        <TableContainer component={Paper}>
                            <Table className={classes.primeTable}>

                                {/* HEAD */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center' variant={'h1'}>Bid</TableCell>
                                        <TableCell align='center' variant={'h1'}>Ask</TableCell>
                                        <TableCell align='center' variant={'h1'}>Qty</TableCell>
                                        <TableCell align='center' variant={'h1'}>Strike</TableCell>
                                    </TableRow>
                                </TableHead>
                                
                                {/* BODY */}
                                <TableBody>
                                    {optionPutRows.map(row => (
                                        <TableRow hover key={row.name} style={{ cursor: 'pointer', }} onClick={() => this.props.handleOptionSelect('put', row.tokenId, row.collateralUnits, row.strikeUnits)}>
                                            <TableCell align='center' variant={'h1'}>{row.bid}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.ask}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.qty}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.strike} {row.strikeUnits}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                
                            </Table>
                        </TableContainer>

                        

                    </Card>
                {/* </Grid> */}
                </Box>
            </>
        );
    };
};

export default withStyles(styles)(OptionsChainTable);