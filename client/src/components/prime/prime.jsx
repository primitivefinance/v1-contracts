import React, { Component, PureComponent } from 'react';
import Item from './item';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { 
    Card,
    Typography,
    Grid,
    Box
} from '@material-ui/core';
import { colors } from '../../theme/theme';

import { DragDropContext } from 'react-beautiful-dnd';
import initialData from './constants';
import Column from './column';

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
    boards: {
        flex: 1,
        display: 'flex',
        width: '80%',
        height: '100vh',
        flexDirection: 'column',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
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


class InnerList extends PureComponent {
    shouldComponentUpdate(nextProps) {
        if(
            nextProps.colun === this.props.column &&
            nextProps.taskMap === this.props.taskMap &&
            nextProps.index === this.props.index
        ) {
            return false;
        }
        return true;
    }

    render() {
        const { column, taskMap, index } = this.props;
        const tasks = column.taskIds.map(taskId => taskMap[taskId]);
        return <Column key={column.id} column={column} tasks={tasks} />;
    }
}

class Prime extends Component {
    constructor(props){
        super()
        this.state = initialData;
        
    
    }

    onDragStart = () => {

    };

    onDragUpdate = () => {

    };

    onDragEnd = result => {
        const { destination, source, draggableId } = result;
        if(!destination) {
            return;
        }

        if(
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const start = this.state.columns[source.droppableId];
        const finish = this.state.columns[destination.droppableId];

        if(start === finish) {
            const newTaskIds = Array.from(start.taskIds);
            newTaskIds.splice(source.index, 1);
            newTaskIds.splice(destination.index, 0, draggableId);

            const newColumn = {
                ...start,
                taskIds: newTaskIds,
            };

            const newState = {
                ...this.state,
                columns: {
                    ...this.state.columns,
                    [newColumn.id]: newColumn,
                },
            };

            this.setState(newState);
            return;
        }

        const startTaskIds = Array.from(start.taskIds);
        startTaskIds.splice(source.index, 1);
        const newStart = {
            ...start,
            taskIds: startTaskIds,
        };

        const finishtaskIds = Array.from(finish.taskIds);
        finishtaskIds.splice(destination.index, 0, draggableId);
        const newFinish = {
            ...finish,
            taskIds: finishtaskIds,
        };

        const newState = {
            ...this.state,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
                [newFinish.id]: newFinish,
            },
        };
        this.setState(newState);

    };
    
    render() {
        const { classes, t } = this.props; 
        return (
            <DragDropContext onDragEnd={this.onDragEnd}>
                <Box className={classes.boards}>
                    {this.state.columnOrder.map((columnId, index) => {
                        const column = this.state.columns[columnId];
                        return (
                            <InnerList
                                key={column.id}
                                column={column}
                                taskMap={this.state.tasks}
                                index={index}
                            />
                        );
                    })}
                </Box>
            </DragDropContext>
        )
        
    }
}

export default (withRouter(withStyles(styles)(Prime)));