import React, { Component } from 'react';
import { colors } from '../../theme';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Box from '@material-ui/core/Box';



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

    container: {
        display: 'flex',
        flexDirection: 'column',
        margin: '48px',
        padding: '16px',
        borderRadius: '4px',
    },

    containerTitle: {
        textAlign: 'center',
        margin: '8px',
        letterSpacing: '2px',
        fontSize: '18px',
    },

    rowContainer1: {
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '6px',
        marginTop: '16px',

    },

    selectedRow1: {
        marginTop: '16px',
        display: 'flex',
        flexDirection: 'row',

    },

    rowItem1H: {
        width: '33%',
        /* textAlign: 'center', */
        fontWeight: '600'
    },

    rowItem2H: {
        width: '100%',
        fontWeight: '600',
        fontSpacing: '1px',
    },

    rowItem3H: {
        /* width: '25%', */
        /* textAlign: 'center', */
        width: '25%',
        marginLeft: '4px',
        fontWeight: '600',
        lettingSpacing: '0px',
        fontSize: '11px',
    },

    rowItem1: {
        width: '33%',
        /* textAlign: 'center', */
    },

    rowItem2: {
        width: '25%',
        marginLeft: '4px',
        /* textAlign: 'center', */
    },

    rowContainer2: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: '4px',
        marginTop: '16px',
    },

    rowButtonL: {
        backgroundColor: colors.leafGreen,
        color: colors.primary,
        '&:hover' : {
            backgroundColor: colors.leafGreen,
            color: colors.primary,
        },
        fontWeight: '600',
        width: '50%',
        borderRadius: '4px',
        margin:'4px',
    },
    
    
    rowButtonS: {
        backgroundColor: colors.background,
        width: '50%',
        borderRadius: '4px',
        margin:'4px',
        color: colors.primary,
        fontWeight: '600',
    },

    rowButtonSubmit: {
        backgroundColor: colors.leafGreen,
        color: colors.primary,
        '&:hover' : {
            backgroundColor: colors.leafGreen,
            color: colors.primary,
        },
        fontWeight: '600',
        width: '50%',
        borderRadius: '4px',
    },

    amountForm: {
        borderRadius: '4px',
        width: '100%',
        backgroundColor: colors.background,
    },

    rowContainer3: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: '4px',
        marginTop: '16px',
    },

    rowContainer4: {
        display: 'flex',
        flexDirection: 'row',
        borderRadius: '4px',
        marginTop: '16px',
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


class OpenPosition extends Component {
    constructor(props) {
        super(props);
        this.state = {
            long: true,
            buy: true,
        };

        this.handleChange = this.handleChange.bind(this);
        this.newPosition = this.newPosition.bind(this);
    }

    handleChange = (event) => {
        console.log(event.target.value, event.target.name)
        let name = event.target.name;
        let value = event.target.value;
        switch(name) {
            case 'deposit':
                this.setState({
                    deposit: value
                });
                break;
            case 'ask': 
                this.setState({
                    ask: value,
                });
                break;
            case 'bid': 
                this.setState({
                    bid: value,
                });
                break;
            case 'quantityBid': 
                this.setState({
                    quantityBid: value,
                });
                break;
        }
    }; 

    newPosition = async (position) => {
        this.setState({
            newPosition: true,
            position: position,
        })
    };

    render () {
        const { classes } = this.props;

        /* GET PROPERTY DATA */
        let cAsset, sAsset, eTimestamp, cAmt, type;

        if(isNaN(cAmt) && typeof cAmt !== 'undefined') {
            cAmt = 'INVALID';
        }
        let properties = (this.props.optionSelection) ? (this.props.optionSelection['properties']) ? this.props.optionSelection['properties'] : { xis: '', yak: '', zed: '', wax: '', pow: '', gem: '',} : '';
        let cAmount, sAmount, quantity;

        if(this.state.newPosition) {
            if(this.state.position === 'long') {
                cAsset = (this.props.optionSelection) ? this.props.optionSelection['cAsset'] : '';
                sAsset = (this.props.optionSelection) ? this.props.optionSelection['sAsset'] : '';
                cAmount = properties.xis;
                sAmount = properties.zed;
            } else {
                cAsset = (this.props.optionSelection) ? this.props.optionSelection['sAsset'] : '';
                sAsset = (this.props.optionSelection) ? this.props.optionSelection['cAsset'] : '';
                sAmount = properties.xis;
                cAmount = properties.zed;
            }
            
            type = (this.props.optionSelection) ? this.props.optionSelection['type'] : '';
            const date = new Date(properties.pow * 1000);
            eTimestamp = (date.toDateString());
            switch(this.state.position) {
                case 'long':
                    if(this.state.long) {
                        break;
                    }
                    this.setState({long: true})
                    break;
                case 'short':
                    if(!this.state.long) {
                        break;
                    }
                    this.setState({long: false})
                    break;
            }
        } else {
            cAsset = (this.props.optionSelection) ? this.props.optionSelection['cAsset'] : '';
            sAsset = (this.props.optionSelection) ? this.props.optionSelection['sAsset'] : '';
            type = (this.props.optionSelection) ? this.props.optionSelection['type'] : '';
            const date = new Date(properties.pow * 1000);
            eTimestamp = (date.toDateString());
            cAmount = properties.xis;
            sAmount = properties.zed;

            switch(type) {
                case 'call':
                    if(this.state.long) {
                        break;
                    }
                    this.setState({long: true})
                    break;
                case 'put':
                    if(!this.state.long) {
                        break;
                    }
                    this.setState({long: false})
                    break;
            }
        }
        
        quantity = (this.state.deposit / (cAmount / 10**18)).toFixed(0);

        return (
            <>
                <Box className={classes.container}>

                    <Typography variant={'h1'} className={classes.containerTitle}>
                        Open Position
                    </Typography>

                    {(cAsset !== '')
                            ?   <>
                                <Box className={classes.rowContainer2}>
                                    <Button className={(this.state.long) ? classes.rowButtonL : classes.rowButtonS} onClick={() => {this.setState({ long: true}); this.newPosition('long');}}>
                                        Long
                                    </Button>
                                    <Button className={(!this.state.long) ? classes.rowButtonL : classes.rowButtonS} onClick={() => {this.setState({ long: false}); this.newPosition('short');}}>
                                        Short
                                    </Button>
                                </Box>

                                <Box className={classes.rowContainer2}>
                                    <Button className={(this.state.buy) ? classes.rowButtonL : classes.rowButtonS} onClick={() => this.setState({ buy: true})}>
                                        Buy
                                    </Button>
                                    <Button className={(!this.state.buy) ? classes.rowButtonL : classes.rowButtonS} onClick={() => this.setState({ buy: false})}>
                                        Sell
                                    </Button>
                                </Box>

                                <Box className={classes.rowContainer1}>
                                    {/* FLEX DIRECTION ROW */}
                                    <Box className={classes.selectedRow1}>
                                        <Typography variant={'h2'} className={classes.rowItem1H}>
                                            Collateral
                                        </Typography>

                                        <Typography variant={'h2'} className={classes.rowItem1H}>
                                            Strike
                                        </Typography>

                                        <Typography variant={'h2'} className={classes.rowItem1H}>
                                            Expiration
                                        </Typography>
                                    </Box>

                                    {/* FLEX DIRECTION ROW */}
                                    <Box className={classes.selectedRow1}>
                                        <Typography variant={'h2'} className={classes.rowItem1}>
                                            {cAmount / 10**18} {cAsset}
                                        </Typography>

                                        <Typography variant={'h2'} className={classes.rowItem1}>
                                            {sAmount / 10**18} {sAsset}
                                        </Typography>

                                        <Typography variant={'h2'} className={classes.rowItem1}>
                                            {eTimestamp}
                                        </Typography>
                                    </Box>
                                </Box>


                                {(this.state.buy) 
                                    ?   
                                        <Box className={classes.rowContainer1}>
                                            {/* FLEX DIRECTION ROW */}
                                            <Box className={classes.selectedRow1}>
                                                <Typography variant={'h1'} className={classes.rowItem1H} >
                                                    BID
                                                </Typography>
                                            </Box>
                                            <Box className={classes.rowContainer3}>
                                            
                                                <TextField
                                                  className={classes.amountForm}
                                                  placeholder={'Bid Price'}
                                                  value={this.state.bid}
                                                  onChange={this.handleChange}
                                                  name='bid'
                                                />
                                                <Typography variant={'h3'} style={{ fontWeight: '600', letterSpacing: '1px', width: '25%', textAlign: 'center', margin: '4px', padding: '4px', alignItems: 'center', justifyContent: 'center', display: 'flex', backgroundColor: colors.lightBanner, borderRadius: '4px'}}>
                                                    {'ETH'}
                                                </Typography>
                                            </Box>

                                            {/* FLEX DIRECTION ROW */}
                                            <Box className={classes.selectedRow1}>
                                                <Typography variant={'h1'} className={classes.rowItem1H} >
                                                    Quantity
                                                </Typography>
                                            </Box>
                                            <Box className={classes.rowContainer3}>
                                            
                                                <TextField
                                                  className={classes.amountForm}
                                                  placeholder={'Quantity'}
                                                  value={this.state.quantityBid}
                                                  onChange={this.handleChange}
                                                  name='quantityBid'
                                                />
                                                <Typography variant={'h3'} style={{ fontWeight: '600', letterSpacing: '1px', width: '25%', textAlign: 'center', margin: '4px', padding: '4px', alignItems: 'center', justifyContent: 'center', display: 'flex', backgroundColor: colors.lightBanner, borderRadius: '4px'}}>
                                                    {'Primes'}
                                                </Typography>
                                            </Box>

                                            <Box className={classes.selectedRow1}>
                                                <Typography variant={'h1'} className={classes.rowItem2H} >
                                                    Subtotal
                                                </Typography>
                                            </Box>
                                            {/* FLEX DIRECTION ROW */}
                                            <Box className={classes.selectedRow1}>
                                                <Typography variant={'h2'} className={classes.rowItem1}>
                                                    Cost:
                                                </Typography>
                                                <Typography variant={'h2'} className={classes.rowItem1}>
                                                    {this.state.bid * this.state.quantityBid} {'ETH'}
                                                </Typography>
                                                <Typography variant={'h2'} className={classes.rowItem1}>
                                                    Credited:
                                                </Typography>
                                                <Typography variant={'h2'} className={classes.rowItem1}>
                                                    {this.state.quantityBid} {'Primes'}
                                                </Typography>
                                            </Box>
                                                    

                                        </Box>
                                        :   <Box className={classes.rowContainer1}>
                                                {/* FLEX DIRECTION ROW */}
                                                <Box className={classes.selectedRow1}>
                                                    <Typography variant={'h1'} className={classes.rowItem1H} >
                                                        DEPOSIT
                                                    </Typography>
                                                </Box>
                                                <Box className={classes.rowContainer3}>
                                
                                                    <TextField
                                                      className={classes.amountForm}
                                                      placeholder={'Deposit Amount'}
                                                      value={this.state.deposit}
                                                      onChange={this.handleChange}
                                                      name='deposit'
                                                    />
                                                    <Typography variant={'h3'} style={{ fontWeight: '600', letterSpacing: '1px', width: '25%', textAlign: 'center', margin: '4px', padding: '4px', alignItems: 'center', justifyContent: 'center', display: 'flex', backgroundColor: colors.lightBanner, borderRadius: '4px'}}>
                                                        {cAsset}
                                                    </Typography>
                                                </Box>


                                                {/* FLEX DIRECTION ROW */}
                                                <Box className={classes.selectedRow1}>
                                                    <Typography variant={'h1'} className={classes.rowItem1H} >
                                                        ASK
                                                    </Typography>
                                                </Box>
                                                <Box className={classes.rowContainer3}>
                                
                                                    <TextField
                                                      className={classes.amountForm}
                                                      placeholder={'Ask Price'}
                                                      value={this.state.ask}
                                                      onChange={this.handleChange}
                                                      name='ask'
                                                    />
                                                    <Typography variant={'h3'} style={{ fontWeight: '600', letterSpacing: '1px', width: '25%', textAlign: 'center', margin: '4px', padding: '4px', alignItems: 'center', justifyContent: 'center', display: 'flex', backgroundColor: colors.lightBanner, borderRadius: '4px'}}>
                                                        {'ETH'}
                                                    </Typography>
                                                </Box>

                                                <Box className={classes.rowContainer1}>

                                                    <Box className={classes.selectedRow1}>
                                                        <Typography variant={'h2'} className={classes.rowItem2H} >
                                                            Sell {quantity} Primes for {this.state.ask} {'ETH'} each
                                                        </Typography>
                                                    </Box>

                                                    <Box className={classes.selectedRow1}>
                                                        <Typography variant={'h1'} className={classes.rowItem2H} style={{marginTop: '16px',}} >
                                                            Mint Prime Option NFT
                                                        </Typography>
                                                    </Box>
                                                    

                                                    {/* FLEX DIRECTION ROW */}
                                                    <Box className={classes.selectedRow1}>
                                                        <Typography variant={'h2'} className={classes.rowItem3H}>
                                                            Quantity
                                                        </Typography>
                                                        <Typography variant={'h2'} className={classes.rowItem3H}>
                                                            Collateral
                                                        </Typography>
                                                
                                                        <Typography variant={'h2'} className={classes.rowItem3H}>
                                                            Strike
                                                        </Typography>
                                                
                                                        <Typography variant={'h2'} className={classes.rowItem3H}>
                                                            Expiration
                                                        </Typography>
                                                    </Box>

                                                    {/* FLEX DIRECTION ROW */}
                                                    <Box className={classes.selectedRow1}>
                                                        <Typography variant={'h2'} className={classes.rowItem2}>
                                                            {quantity}x
                                                        </Typography>

                                                        <Typography variant={'h2'} className={classes.rowItem2}>
                                                            {cAmount / 10**18} {cAsset}
                                                        </Typography>

                                                        <Typography variant={'h2'} className={classes.rowItem2}>
                                                            {sAmount / 10**18} {sAsset}
                                                        </Typography>

                                                        <Typography variant={'h2'} className={classes.rowItem2}>
                                                            {eTimestamp}
                                                        </Typography>
                                                    </Box>

                                                    <Box className={classes.selectedRow1}>
                                                        <Typography variant={'h1'} className={classes.rowItem2H} >
                                                            Subtotal
                                                        </Typography>
                                                    </Box>

                                                    {/* FLEX DIRECTION ROW */}
                                                    <Box className={classes.selectedRow1}>
                                                        <Typography variant={'h2'} className={classes.rowItem1}>
                                                            Deposit:
                                                        </Typography>

                                                        <Typography variant={'h2'} className={classes.rowItem1}>
                                                            {this.state.deposit} {cAsset}
                                                        </Typography>

                                                        <Typography variant={'h2'} className={classes.rowItem1}>
                                                            Credited:
                                                        </Typography>

                                                        <Typography variant={'h2'} className={classes.rowItem1}>
                                                            {quantity * this.state.ask} {'ETH'}
                                                        </Typography>
                                                    </Box>

                                                </Box>


                                            </Box>
                                }

                                <Box className={classes.rowContainer4}>
                                    <Button className={classes.rowButtonSubmit} onClick={() => this.props.handleOrder(this.state.deposit, this.state.bid, this.state.ask, cAmount, cAsset, sAmount, sAsset, properties.pow)}>
                                        {(this.state.buy) ? 'Open Buy Order' :  'Open Sell Order'}
                                    </Button>
                                </Box>
                                </>

                            :   <Typography variant={'h1'} className={classes.containerTitle} style={{ height: '50vh', alignItems: 'center', display: 'flex', justifyContent: 'center',}}>
                                    Select an Option
                                </Typography>
                        }

                </Box>
            </>
        );
    };
};

export default withStyles(styles)(OpenPosition);