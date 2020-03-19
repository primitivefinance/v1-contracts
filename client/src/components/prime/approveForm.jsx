import React, { Component } from 'react';
import { colors } from '../../theme';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import PrimeOutput from './primeOutput';


const styles = theme => ({
    submitCard: {
        display: 'flex',
        margin: '16px',
        minWidth: '10%',
        minHeight: '10%',
        flexDirection: 'row',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
        backgroundColor: colors.banner,
        color: colors.primary,
        borderRadius: '0px',
    },
    submitCardTypography: {
        /* margin: '16px', */
        marginLeft: '16px',
        marginRight: '16px',
        marginTop: '16px',
        marginBottom: '4px',
    },
    submitCardText: {
        /* margin: '12px', */
        marginLeft: '12px',
        marginRight: '12px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'row',
        
    },
    submitCardButton: {
        margin: '8px',
        color: colors.background,
        backgroundColor: state => state.isValid ? colors.success : colors.secondary,
        '&:hover': {
            backgroundColor: state => state.isValid ? colors.success : colors.success,
        },
    },
});



class ApproveForm extends Component {
    constructor(props) {
        super(props);
    }

    render () {
        const { classes } = this.props;

        return (
            <>
            {/* ORDER SUMMARY */}
            <Card className={classes.submitCard}>
                <Typography variant={'h1'} className={classes.submitCardTypography}>
                        Set Allowance
                </Typography>
                <Typography variant={'h3'} className={classes.submitCardTypography}>
                        This permission allows Prime to interact with your {this.props.asset}.
                </Typography>

                <Button 
                    className={classes.submitCardButton}
                    /* disabled={(this.props.isValid) ? false : true} */
                    onClick={ () => {this.props.handleAllowance(this.props.asset)}} 
                >
                    <Typography variant={'h1'}>
                        Approve
                    </Typography>
                </Button>
            </Card>
            </>
        );
    };
};

export default withStyles(styles)(ApproveForm);