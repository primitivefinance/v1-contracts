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


class PositionsTable extends Component {
    constructor(props) {
        super(props);
    }

    render () {
        const { classes } = this.props;
        const positionRows = (this.props.positionRows) ? (this.props.positionRows) : [];

        return (
            <>
            {/* PRIME INVENTORY CONTAINER */}
                <Grid item>
                    <Card className={classes.primeInventory}>

                        {/* PRIME TABLE */}
                        <TableContainer component={Paper}>
                            <Table className={classes.primeTable}>

                                {/* HEAD */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center' variant={'h1'}>ID</TableCell>
                                        <TableCell align='center' variant={'h1'}>Long/Short</TableCell>
                                        <TableCell align='center' variant={'h1'}>Collateral / Strike</TableCell>
                                        <TableCell align='center' variant={'h1'}>Net P/L</TableCell>
                                        <TableCell align='center' variant={'h1'}>Cost Basis</TableCell>
                                        <TableCell align='center' variant={'h1'}>Premium</TableCell>
                                        <TableCell align='center' variant={'h1'}>Expiration</TableCell>
                    
                                    </TableRow>
                                </TableHead>
                                
                                {/* BODY */}
                                <TableBody>
                                    {positionRows.slice(1, 1 * 20 + 20).map(row => (
                                        <TableRow key={row.name}>
                                            <TableCell align='center' variant={'h1'}>{row.tokenId}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.longOrShort}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.name}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.netProfit}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.costBasis}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.premium}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.expiration}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                
                            </Table>
                        </TableContainer>

                    </Card>
                </Grid>
            </>
        );
    };
};

export default withStyles(styles)(PositionsTable);