import React, { Component, PureComponent } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import LinkM from '@material-ui/core/Link';
import GitHubIcon from '@material-ui/icons/GitHub';
import TwitterIcon from '@material-ui/icons/Twitter';

import Web3 from 'web3';
import HorizontalNonLinearStepper from './stepper';
import Board from './board';
import Column from './column';
import OrderSummary from './summary';
import NavButton from './navButton';
import Footer from './footer';

import INITIAL_CONTEXT from './constants';
import TOKENS_CONTEXT from './tokenAddresses';
import PrimeContract from '../../artifacts/Prime.json';

import MintForm from './mintForm';
import INITIAL_OPTIONS from './intialOptions';

const styles = theme => ({
    root: {
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        backgroundColor: colors.background,
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        },
    },
    chainContainer: {
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
    },
    chainHeader: {

    },
    chainBody: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        margin: '16px',
    },
    chainFooter: {

    },
});

class PrimeV2 extends Component {
    constructor(props) {
        super(props);
        this.state = INITIAL_OPTIONS;
    }


    render () {
        const { classes } = this.props;
        

        return(
            <>
            <div className={classes.root} key='root'>

                {/* CONTAINER FOR CHAIN */}
                <Card className={classes.chainContainer}>
                    
                    {/* CHAIN HEADER */}
                    <Typography variant={'h1'}>
                        Test
                    </Typography>

                    {/* CHAIN BODY */}
                    <MintForm
                        classes={classes}
                        assets={this.state.assets}
                        expirations={this.state.expirations}
                    />

                    {/* CHAIN FOOTER */}


                </Card>
                
            </div>    
            </>
        );
    };

};

export default withStyles(styles)(PrimeV2);