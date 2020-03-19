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
    },

    rowContainer1: {
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '6px',

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
    rowItem1: {
        width: '33%',
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
    }

    handleChange = (event) => {
        console.log(event.target.value)
    }; 

    render () {
        const { classes } = this.props;

        /* GET PROPERTY DATA */
        let cAsset, sAsset, eTimestamp, cAmt, pAmt;

        if(isNaN(cAmt) && typeof cAmt !== 'undefined') {
            cAmt = 'INVALID';
        }
        let properties = (this.props.optionSelection) ? (this.props.optionSelection['properties']) ? this.props.optionSelection['properties'] : { xis: '', yak: '', zed: '', wax: '', pow: '', gem: '',} : '';
        
        cAsset = (this.props.optionSelection) ? this.props.optionSelection['cAsset'] : '';
        sAsset = (this.props.optionSelection) ? this.props.optionSelection['sAsset'] : '';
        const date = new Date(properties.pow * 1000);
        eTimestamp = (date.toDateString());
        
        return (
            <>
                <Box className={classes.container}>

                    <Typography variant={'h1'} className={classes.containerTitle}>
                        Selected Option
                    </Typography>

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
                                {(properties.xis / 10**18)} {cAsset}
                            </Typography>

                            <Typography variant={'h2'} className={classes.rowItem1}>
                                {(properties.zed / 10**18)} {sAsset}
                            </Typography>

                            <Typography variant={'h2'} className={classes.rowItem1}>
                                {eTimestamp}
                            </Typography>
                        </Box>
                    </Box>

                    <Box className={classes.rowContainer2}>
                        <Button className={(this.state.long) ? classes.rowButtonL : classes.rowButtonS} onClick={() => this.setState({ long: true})}>
                            Long
                        </Button>
                        <Button className={(!this.state.long) ? classes.rowButtonL : classes.rowButtonS} onClick={() => this.setState({ long: false})}>
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
                                      placeholder={'Amount'}
                                      value={this.state.amount}
                                      onChange={this.handleChange}
                                    />
                                    <Typography variant={'h3'} style={{ fontWeight: '600', letterSpacing: '1px', width: '25%', textAlign: 'center', margin: '4px', padding: '4px', alignItems: 'center', justifyContent: 'center', display: 'flex', backgroundColor: colors.lightBanner, borderRadius: '4px'}}>
                                        {'ETH'}
                                    </Typography>
                                </Box>
                            </Box>
                            :   <Box className={classes.rowContainer3}>
                                    <form className={classes.amountForm} noValidate autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                                          <TextField
                                            placeholder={'Amount'}
                                            value={this.state.amount}
                                            onChange={this.handleChange}
                                          />
                                    </form>
                                </Box>
                    }
                    

                </Box>
            </>
        );
    };
};

export default withStyles(styles)(OpenPosition);