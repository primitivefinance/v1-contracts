import React, { Component } from 'react';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { 
    Card,
    Typography,
    Grid
} from '@material-ui/core';
import { colors } from '../../theme/theme';
import { ItemTypes } from './constants';
import { useDrag } from 'react-dnd';

const styles = theme => ({
    root: {
        flex: 1,
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        margin: '16px',
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
        flexDirection: 'row',
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'background-color 0.2s linear',
        [theme.breakpoints.up('sm')]: {
            height: '2.5vh',
            minWidth: '20%',
            minHeight: '2vh',
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


class Item extends Component {
    constructor (props) {
        super()
    }
    render() {
        const { classes, t } = this.props;
        const [{isDragging}, drag] = useDrag({
            item: { type: ItemTypes.VARIABLE },
            collect: monitor => ({
                isDragging: !!monitor.isDragging(),
            }),
        })
        return (
            <div className={ classes.root } ref={drag}>
                <Card className={`${classes.item} ${classes.prime}`} onClick={ () => {}} >
                    <Typography variant={'h2'} className={`${classes.title}`}>
                        {this.props.item.name}
                    </Typography>
                </Card>
            </div>
        );
    }
}

export default (withRouter(withStyles(styles)(Item)));