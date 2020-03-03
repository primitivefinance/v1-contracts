import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import { 
    Card,
    Typography,
    Grid,
    Box,
} from '@material-ui/core';
import { Droppable } from 'react-beautiful-dnd';
import Item from './item';

const styles = theme => ({
    board: {
        flex: 1,
        display: 'flex',
        minHeight: '25vh',
        margin: '16px',
        flexDirection: 'column',
        transition: 'background-color 0.25s linear',
    },
    list: {
        flexGrow: 1,
        padding: '16px',
        minHeight: '10vh',
    },
    prime: {
        backgroundColor: colors.white,
        '&:hover': {
            backgroundColor: colors.lightred,
            '& .title': {
                color: colors.white
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
        display: 'flex',
        padding: '16px',
        paddingBottom: '0px',
        justifyContent: 'center',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '8px'
        }
    },
});


class InnerList extends Component {
    shouldComponentUpdate(nextProps) {
        if(nextProps.tasks === this.props.tasks) {
            return false;
        }
        return true;
    }

    render () {
        return this.props.tasks.map((task, index) => (
            <Item key={task.id} task={task} index={index} />
        ));
    }
}

class Column extends Component {
    render() {
        const { classes, t } = this.props;
        return(
            <Card className={`${classes.board} ${classes.prime}`}>
                <Typography variant={'h1'} className={`${classes.title} title`}>
                    {this.props.column.title}
                </Typography>
                <Droppable droppableId={this.props.column.id}>
                    {(provided) => (
                        <Typography
                            className={classes.list}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            <InnerList tasks={this.props.tasks} />
                            {provided.placeholder}
                        </Typography>
                    )}
                </Droppable>
            </Card>
        );
    }
}

export default withStyles(styles)(Column);