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

import Button from '@material-ui/core/Button';
import Switch from '@material-ui/core/Switch';
import Paper from '@material-ui/core/Paper';
import Fade from '@material-ui/core/Fade';
import Zoom from '@material-ui/core/Zoom';





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
            backgroundColor: colors.blue,
            '& .title': {
                color: colors.white
            },
            '& .icon': {
                color: colors.white
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
        }
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
    
    componentDidMount = () => {
      setTimeout(() => {
        this.setState({
          loading: false
        })
      }, 1000)
      setTimeout(() => {
        this.setState({
          done: true
        })
      }, 2000)
    }

    render () {
        const { classes, t } = this.props;
        return (
        <>
            <div className={ classes.root }>
                {!this.state.done ? (
                    <Grid item className={classes.loading}>
                        <Zoom in={this.state.loading} timeout={1000}>
                            <img alt="" src={loading} />
                        </Zoom>
                    </Grid> 
                ) : (
                    <Fade in={this.state.done} timeout={1000}>
                        <Grid container className={classes.root}>
                            <Grid item xs={12}>
                                <Typography variant={'h1'} className={ `${classes.brand}`}>

                                </Typography>
                            </Grid>
                            <Grid item xs={4}>
                                    <Typography variant={'h1'} className={ `${classes.brand} ${classes.title} title`}>
                                        Select a product
                                        </Typography>
                                <Card className={`${classes.card} ${classes.prime}`} onClick={ () => { this.navigate('/prime') }}>
                                    <GraphicEqIcon className={ `${classes.icon} icon` }/>
                                    <Typography variant={'h1'} className={ `${classes.title} title`}>Prime</Typography>
                                    <Typography variant={'h2'} className={ `${classes.title} title`}>ERC-20 Derivative</Typography>
                                </Card>
                            </Grid>
                        </Grid>
                    </Fade>
                )
            }
            </div>
        </>
        )
    };
    
    navigate = (screen) => {
        this.props.history.push(screen)
    }
}

export default (withRouter(withStyles(styles)(Home)));
