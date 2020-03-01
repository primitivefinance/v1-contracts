import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import {
    Card,
    Typography
} from '@material-ui/core';
import { colors } from "../../theme/theme";
import GraphicEqIcon from '@material-ui/icons/GraphicEq';
import BarChartIcon from '@material-ui/icons/BarChart';





const styles = theme => ({
    root: {
        flex: 1,
        display: 'flex',
        width: '100%',
        justifyConent: 'space-around',
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
        justifyConent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        cursor: 'pointer',
        borderRadius: '0px',
        transition: 'background-color 0.2s linear',
        [theme.breakpoints.up('sm')]: {
            height: '90vh',
            minWidth: '20%',
            minHeight: '40vh',
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
        height: '2.5vh',
        width: '100%',
        display: 'flex',
        justifyConent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        borderRadius: '0px',
        transition: 'background-color 0.2s linear',
        [theme.breakpoints.up('sm')]: {
            height: '10vh',
            minWidth: '20%',
            minHeight: '5vh',
        }
    },
});

class Home extends Component {
    constructor (props) {
        super()
        this.state = {

        }
    }

    render () {
        const { classes, t } = this.props;
        return (
        <>
            <div className={ classes.root }>
                <Card className={`${classes.prompt}`} onClick={ () => {}}>
                    <Typography variant={'h1'} className={ `${classes.title} title`}>
                        Select a product
                        </Typography>
                </Card>
            </div>
            
            <div className={ classes.root }>
                <Card className={`${classes.card} ${classes.prime}`} onClick={ () => {}}>
                    <GraphicEqIcon className={ `${classes.icon} icon` }/>
                    <Typography variant={'h1'} className={ `${classes.title} title`}>Prime</Typography>
                    <Typography variant={'h2'} className={ `${classes.title} title`}>ERC-20 Derivative</Typography>
                </Card>
            </div>
        </>
        )
    };
}

export default (withRouter(withStyles(styles)(Home)));
