import React, { Component } from 'react';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { 
    Card,
    Typography,
    Grid
} from '@material-ui/core';
import { colors } from '../../theme/theme';

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
        height: '15vh',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '8px',
        cursor: 'pointer',
        [theme.breakpoints.up('sm')]: {
            height: '20vh',
            minWidth: '20%',
            minHeight: '5vh',
        }
    },
    board: {
        flex: '1',
        height: '25vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        borderRadius: '8px',
        cursor: 'pointer',
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
            backgroundColor: colors.lightblue,
            '& .title': {
                color: colors.blue
            },
            '& .icon': {
                color: colors.blue
            },
        },
        '& .title': {
            color: colors.blue
        },
        '& .icon': {
            color: colors.blue
        }
    },
    title: {
        padding: '24px',
        paddingBottom: '0px',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '24px'
        }
    },
});


class Board extends Component {
    constructor (props) {
        super()
    }
    render() {
        const { classes, t } = this.props;

        return(
            <div className={ classes.root }>
                <Grid item xs={6}>
                    <Card className={`${classes.board} ${classes.prime}`} onClick={ () => { } }>
                        <Typography variant={'h1'} className={`${classes.title} title`}>Board</Typography>
                    </Card>
                </Grid>
            </div>
        );
    }
}

export default (withRouter(withStyles(styles)(Board)));