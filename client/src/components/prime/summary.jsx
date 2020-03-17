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
        /* marginRight: '32px', */
        width: '15%',
        height: '20%',
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
        props.handleAssetAmount(props.columnId, value)
    };

    const handleSubmit = () => {
        props.handleAssetAmount(props.columnId, value)
    };
  
    return (
      <form className={classes.amountForm} noValidate autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <TextField
            placeholder='Amount'
            value={value}
            onChange={handleChange}
          />
    </form>
    );
};


class OrderSummary extends Component {
    constructor(props) {
        super(props);
    }

    render () {
        const { classes } = this.props;

        /* GET PROPERTY DATA */
        let cAsset, pAsset, eTimestamp, aReceiver, cAmt, pAmt, boardState, items;
        boardState = (typeof this.props.boardStates !== 'undefined') ? this.props.boardStates : 'undefined';
        items = this.props.items;
        if(typeof boardState !== 'undefined') {
            if(boardState['collateralBoard']) {
                if(boardState['collateralBoard']['itemIds'].length > 0) {
                    cAsset = items[boardState['collateralBoard']['itemIds'][0]].payload;
                    cAmt = ((this.props.collateralAmount) / 10**18).toFixed(6);
                };
            };

            if(boardState['paymentBoard']) {
                if(boardState['paymentBoard']['itemIds'].length > 0) {
                    pAsset = items[boardState['paymentBoard']['itemIds'][0]].payload;
                    pAmt = this.props.paymentAmount;
                };
            };

            if(boardState['expirationBoard']) {
                if(boardState['expirationBoard']['itemIds'].length > 0) {
                    eTimestamp = items[boardState['expirationBoard']['itemIds'][0]].payload;
                    let date = new Date(eTimestamp * 1000);
                    let datetime = date.toDateString();
                    eTimestamp = datetime;
                };
            };

            if(boardState['addressBoard']) {
                if(boardState['addressBoard']['itemIds'].length > 0) {
                    aReceiver = items[boardState['addressBoard']['itemIds'][0]].payload;
                };
            };
        };

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
                        columnId={'collateralBoard'}
                        handleAssetAmount={this.props.handleAssetAmount}
                      />
                </form>
                <Typography variant={'h2'} className={classes.submitCardTypography}>
                        How much will the collateral cost?
                </Typography>
            
                    <form noValidate autoComplete="off" className={classes.submitCardText}>
                          <MultilineTextFields
                            classes={classes}
                            columnId={'paymentBoard'}
                            handleAssetAmount={this.props.handleAssetAmount}
                          />
                          <Typography variant={'h2'} style={{ alignItems: 'center', display: 'flex', marginLeft: '8px', fontWeight: '600' }}>
                            {pAsset}
                        </Typography>
                    </form> 
                {/* <Typography variant={'h2'} className={classes.submitCardTypography}>
                        Expires: {eTimestamp}
                </Typography> */}
                {/* <Typography variant={'h2'} className={classes.submitCardTypography}>
                        Payment Receiver: {aReceiver}
                </Typography> */}
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
                    onClick={ () => {this.props.handleBoardSubmit()}} 
                >
                    <Typography variant={'h1'}>
                        Create Prime
                    </Typography>
                </Button>
                {/* <PrimeOutput
                    primeRows={this.props.primeRows}
                /> */}
            </Card>
            </>
        );
    };
};

export default withStyles(styles)(OrderSummary);