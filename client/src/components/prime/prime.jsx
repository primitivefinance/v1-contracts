import React, { Component } from 'react';
import Item from './item';
import Board from './board';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { 
    Card,
    Typography,
    Grid
} from '@material-ui/core';
import { colors } from '../../theme/theme';

import HTML5Backend from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

const styles = theme => ({
    root: {
        flex: 1,
        display: 'flex',
        width: '100%',
        height: '100vh',
        justifyContent: 'left',
        alignItems: 'center',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        }
    },
    item: {
        flex: '1',
        height: '2.5vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        borderRadius: '16px',
        padding: '24px',
        margin: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s linear',
        [theme.breakpoints.up('sm')]: {
            height: '2.5vh',
            minWidth: '20%',
            minHeight: '2vh',
        }
    },
    board: {

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


class Prime extends Component {
    constructor(props){
        super()
        this.state = {
            items: [
                { id: 1, name: 'Item 1'},
                { id: 2, name: 'Item 2'},
                { id: 3, name: 'Item 3'},
                { id: 4, name: 'Item 4'},
            ],
        }
    
    }
    
    render() {
        const { classes, t } = this.props; 
        return (
            <DndProvider backend={HTML5Backend}>
                <div className={classes.root}>
                    <Grid container className={classes.root}>
                        <Grid item xs={4} spacing={4}>
                                {this.state.items.map((item, index) => (
                                    <Item key={item.id} item={item} />
                                ))}
                        </Grid>
                        <Grid item xs={8}>
                            <Board />
                        </Grid>
                    </Grid>
                </div>
            </DndProvider>
        );
    }
}

export default (withRouter(withStyles(styles)(Prime)));