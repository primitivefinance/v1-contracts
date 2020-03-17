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
        alignItems: 'center',
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


class PrimeOutput extends Component {
    constructor(props) {
        super(props);
    }

    render () {
        const { classes } = this.props;
        const primeRows = (this.props.primeRows) ? (this.props.primeRows) : [];
        
        return (
            <>
            {/* PRIME INVENTORY CONTAINER */}
                <Grid item>
                    <Card className={classes.primeInventory}>
                        <Typography className={classes.title} variant={'h1'}>
                            Crafted Prime Output
                        </Typography>

                        {/* PRIME TABLE */}
                        <TableContainer component={Paper}>
                            <Table className={classes.primeTable}>

                                {/* HEAD */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center' variant={'h2'}>Underlying</TableCell>
                                        <TableCell align='center' variant={'h2'}>Strike Price</TableCell>
                                        <TableCell align='center' variant={'h2'}>Expiration</TableCell>
                                    </TableRow>
                                </TableHead>
                                
                                {/* BODY */}
                                <TableBody>
                                    {primeRows.map(row => (
                                        <TableRow key={row.name}>
                                            <TableCell align='center' variant={'h3'}>{row.xis} {row.yakSymbol}</TableCell>
                                            <TableCell align='center' variant={'h3'}>{row.zed} {row.waxSymbol}</TableCell>
                                            <TableCell align='center' variant={'h3'}>{row.pow}</TableCell>
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

export default withStyles(styles)(PrimeOutput);