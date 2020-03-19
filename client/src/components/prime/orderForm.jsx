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


/* SEPARATE */
function MultilineTextFields(props) {
    const { classes } = props;
    const [value, setValue] = React.useState();
  
    const handleChange = event => {
        setValue(event.target.value);
        let value = event.target.value;
        props.handleSelectAmount(props.name, value)
    };

    const handleSubmit = () => {
        props.handleSubmit();
    };
    console.log(props.amount);
    return (
      <form className={classes.amountForm} noValidate autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <TextField
            placeholder={'Amount'}
            value={props.amount}
            onChange={handleChange}
          />
    </form>
    );
};


class OrderForm extends Component {
    constructor(props) {
        super(props);
    }

    render () {
        const { classes } = this.props;

        /* GET PROPERTY DATA */
        let cAsset, pAsset, eTimestamp, cAmt, pAmt;
        cAmt = this.props.collateralAmount;
        pAmt = this.props.paymentAmount;
        cAsset = this.props.collateral;
        pAsset = this.props.payment;
        eTimestamp = this.props.expiration;
        if(isNaN(cAmt) && typeof cAmt !== 'undefined') {
            cAmt = 'INVALID';
        }

        return (
            <>
            {/* ORDER SUMMARY */}
            <Card className={classes.submitCard}>
                <Typography variant={'h1'} className={classes.submitCardTypography}>
                        Order Summary
                </Typography>
                <Typography variant={'h2'} className={classes.submitCardTypography}>
                        How much {cAsset} will you deposit?
                </Typography>
                <form noValidate autoComplete="off" className={classes.submitCardText}>
                      <MultilineTextFields
                        classes={classes}
                        handleSelectAmount={this.props.handleSelectAmounts}
                        name={'collateral'}
                        amount={cAmt}
                      />
                      <Typography variant={'h2'} style={{ alignItems: 'center', display: 'flex', marginLeft: '8px', fontWeight: '600' }}>
                                {cAsset}
                        </Typography>
                </form>
                <Typography variant={'h2'} className={classes.submitCardTypography}>
                        How much will the {cAsset} cost in {pAsset}?
                </Typography>
            
                    <form noValidate autoComplete="off" className={classes.submitCardText}>
                            <MultilineTextFields
                              classes={classes}
                              handleSelectAmount={this.props.handleSelectAmounts}
                              name={'payment'}
                              amount={pAmt}
                            />
                            <Typography variant={'h2'} style={{ alignItems: 'center', display: 'flex', marginLeft: '8px', fontWeight: '600' }}>
                                {pAsset}
                            </Typography>
                    </form>
                <PrimeOutput
                    primeRows={this.props.primeRows}
                />
                <Typography variant={'h1'} className={classes.submitCardTypography}>
                        Deposit Subtotal: {cAmt} {cAsset}
                </Typography>
                
                {/* FIX - SHOULDNT BE VALID IF QTY IS NOT ENTERED */}
                <Button 
                    className={classes.submitCardButton}
                    disabled={(this.props.isValid) ? false : true}
                    onClick={ () => {this.props.handleSubmit()}} 
                >
                    <Typography variant={'h1'}>
                        Create Prime
                    </Typography>
                </Button>
            </Card>
            </>
        );
    };
};

export default withStyles(styles)(OrderForm);