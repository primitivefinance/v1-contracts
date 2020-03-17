import React, { Component } from 'react';
import { colors } from '../../theme';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';


const styles = theme => ({
    walletTable: {
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.primary,
        backgroundColor: colors.banner,
    },
    mintButton: {
        backgroundColor: colors.primary,
        color: colors.banner,
        '&:hover' : {
            backgroundColor: colors.banner,
            color: colors.primary,
            fontWeight: '600',
        },
        fontWeight: '500',
        marginLeft: '24px',
    },
    walletBalances: {
        textTransform: 'uppercase',
    },
    title: {
        padding: '24px',
        paddingBottom: '0px',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '24px'
        },
        color: colors.primary,
    },

});



class WalletTable extends Component {
    constructor(props) {
        super(props);
    }

    render () {
        const { classes } = this.props;
        const walletRows = (this.props.walletRows) ? (this.props.walletRows) : [];
        
        return (
            <>

            {/* WALLET INVENTORY CONTAINER */}
                <Grid item>
                    <Card className={classes.walletBalances}>
                        <Typography className={classes.title} variant={'h1'}>
                            {this.props.balancesOf} Balances
                        </Typography>

                        {/* WALLET TABLE */}
                        <TableContainer component={Paper}>
                            <Table className={classes.walletTable}>

                                {/* HEAD */}
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center' variant={'h1'}>Symbol</TableCell>
                                        <TableCell align='center' variant={'h1'}>Balance</TableCell>
                                        <TableCell align='center' variant={'h1'}>Deposit</TableCell>
                                    </TableRow>
                                </TableHead>
                                
                                {/* BODY */}
                                <TableBody>
                                    {walletRows.map(row => (
                                        <TableRow key={row.symbol}>
                                            <TableCell align='center' variant={'h1'}>{row.symbol}</TableCell>
                                            <TableCell align='center' variant={'h1'}>{row.balance}</TableCell>
                                            <TableCell align='center' variant={'h1'} >{
                                                <Button 
                                                    onClick={() => this.props.handleMint(row.symbol)}
                                                    className={classes.mintButton}
                                                >
                                                    Mint
                                                </Button>
                                                }
                                            </TableCell>
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

export default withStyles(styles)(WalletTable);