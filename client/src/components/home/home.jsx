import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import {
    Card,
    Typography,
    Grid,
    Box
} from '@material-ui/core';
import { colors } from "../../theme/theme";
import GraphicEqIcon from '@material-ui/icons/GraphicEq';
import BarChartIcon from '@material-ui/icons/BarChart';
import loading from './830.svg';
import Web3 from 'web3';

import Button from '@material-ui/core/Button';
import Switch from '@material-ui/core/Switch';
import Paper from '@material-ui/core/Paper';
import Fade from '@material-ui/core/Fade';
import Zoom from '@material-ui/core/Zoom';
import Link from '@material-ui/core/Link';
/* import Link from 'react-router-dom/Link'; */
import Page from '../prime/page';
import getWeb3 from '../getWeb3';
import SvgIcon from '@material-ui/core/SvgIcon';
import DFCP from './dfcplogo.svg'


const styles = theme => ({
    root: {
        flex: 1,
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        }
    },
    card: {
        flex: '1',
        height: '25vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        cursor: 'pointer',
        borderRadius: '0px',
        transition: 'background-color 0.2s linear',
        [theme.breakpoints.up('sm')]: {
            height: '80vh',
            minWidth: '20%',
            minHeight: '50vh',
        }
    },
    prime: {
        backgroundColor: colors.white,
        '&:hover': {
            backgroundColor: colors.primeBlue,
            '& .title': {
                color: colors.background
            },
            '& .icon': {
                color: colors.background
            },
        },
        '& .title': {
            color: colors.blue
        },
        '& .icon': {
            color: colors.blue
        }
    },
    prompt: {
        flex: '1',
        height: '10vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        borderRadius: 0,
        transition: 'background-color 0.2s linear',
        [theme.breakpoints.up('sm')]: {
            height: '5vh',
            minWidth: '20%',
            minHeight: '5vh',
        }
    },
    title: {
        padding: '24px',
        paddingBottom: '0px',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '24px'
        },
        fontWeight: '600',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        fontFamily: ['Roboto Mono', 'sans-serif'].join(","),
    },
    icon: {
        fontSize: '60px',
        [theme.breakpoints.up('sm')]: {
            fontSize: '100px'
        }
    },
    brand: {
        flex: '1',
        padding: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '5vh',
        borderRadius: '0px',
        [theme.breakpoints.up('sm')]: {
            height: '5vh',
            minWidth: '20%',
            minHeight: '5vh',
        }
    },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        borderRadius: '0px',
        [theme.breakpoints.up('sm')]: {
            height: '100vh',
            minWidth: '20%',
            minHeight: '50vh',
        }
    },
});

class Home extends Component {
    constructor (props) {
        super()
        this.state = {
            loading: true,
            done: false,
        }
    }
    
    componentDidMount = async () => {
        
        setTimeout(() => {
            this.setState({
              loading: false
            })
        }, 500)
        setTimeout(() => {
            this.setState({
              done: true
            })
        }, 1000)
    }

    render () {
        const { classes, t } = this.props;
        return (
            <Page>
                <div className={ classes.root }>
                    {!this.state.done ? (
                        <Grid item className={classes.loading}>
                            <Fade in={this.state.loading} timeout={500}>
                                <img alt="" src={loading} />
                            </Fade>
                        </Grid> 
                    ) : (
                        <Fade in={this.state.done} timeout={500}>
                            <Grid container className={classes.root}>
                                <Grid item xs={12}>
                                    <Typography variant={'h1'} className={ `${classes.brand}`}>

                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                        <Typography variant={'h1'} className={ `${classes.brand} ${classes.title} title`}>
                                            Select a product
                                            </Typography>
                                    <Link 
                                        href='/prime'
                                        /* style={{ textDecoration: 'none' }} */
                                        underline='none'
                                    >
                                    <Card className={`${classes.card} ${classes.prime}`} href='/prime' /* onClick={ () => { this.navigate('/prime') }} */>
                                        {/* <GraphicEqIcon className={ `${classes.icon} icon` }/> */}
                                        <img alt="" src={DFCP} />
                                        <Typography variant={'h1'} className={ `${classes.title} title`}>Prime</Typography>
                                        <Typography variant={'h2'} className={ `${classes.title} title`}>ERC-20 Derivative</Typography>
                                    </Card>
                                    </Link>
                                </Grid>
                            </Grid>
                        </Fade>
                    )
                }
                </div>
            </Page>
        );
    };
    
    navigate = (screen) => {
        this.props.history.push(screen)
    }
}

export default (withRouter(withStyles(styles)(Home)));
