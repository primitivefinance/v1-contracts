import React, { Component } from 'react';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { 
    Card,
    Typography,
    Grid,
    Box,
    Button,
    IconButton
} from '@material-ui/core';
import { colors } from '../../theme/theme';
import { Draggable } from 'react-beautiful-dnd';
import DeleteIcon from '@material-ui/icons/Delete';
import RestoreIcon from '@material-ui/icons/Restore';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';



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
        flex: 1,
        height: '2.5vh',
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'row',
        borderRadius: '4px',
        padding: '24px',
        margin: '8px',
        cursor: 'pointer',
        alignItems: 'center',
        transition: 'background-color 0.2s linear',
        [theme.breakpoints.up('sm')]: {
            height: '2.5vh',
            minWidth: '20%',
            minHeight: '2vh',
        },
    },
    prime: {
        backgroundColor: props => (props.isDragDisabled ? colors.palered : colors.white),
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
    disabled: {
        backgroundColor: colors.lightGrey,
        '&:hover': {
            backgroundColor: colors.lightGrey,
        },
    },
    activeButton: {
        /* color: colors.blue, */
    },
    disabledButton: {
        color: colors.blue,
    },
    title: {
    },
    dragging: {
        opacity: 1,
        cursor: 'pointer',
        flex: 1,
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        margin: '16px',
        backgroundColor: colors.palered,
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        }
    },
    icon: {
        display: 'flex',
        //paddingLeft: '10%',
    },
    onBoard: {
        backgroundColor: colors.success,
    },
});


class Asset extends Component {

    
    render() {
        const { 
            classes, 
            boardItems, 
            item, 
            index, 
            column, 
            handleUndo,
            handleDelete,
            isOnBoard,
        } = this.props;

        let isDragDisabled = false;
        let onBoard = isOnBoard(item.id, column.id);
        return (
            <Draggable 
                draggableId={item.id} 
                index={index}
                isDragDisabled={isDragDisabled}
            >
                {(provided, snapshot) => (
                    <Box
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        ref={provided.innerRef}
                        isDragging={snapshot.isDragging}
                    >
                        <Card 
                            className={
                                (onBoard)
                                ? `${classes.item} ${classes.onBoard}`
                                    :
                                        (isDragDisabled) 
                                        ? `${classes.item} ${classes.disabled}` 
                                            :  `${classes.item} ${classes.prime}`
                            }
                            color={(onBoard) ? 'success' : colors.white}
                        >
                            <Typography variant={'h2'} className={`${classes.title}`}>
                                {this.props.item.content}
                            </Typography>
                            <IconButton
                                color={colors.background}
                                /* className={`${classes.activeButton}`} */
                                onClick={() => handleUndo(item.id, column.id)}
                            >
                                <RestoreIcon />
                            </IconButton>
                            <IconButton
                                color={colors.background}
                                onClick={() => handleDelete(item.id, column.id)} 
                            >
                                <HighlightOffIcon />
                            </IconButton>
                        </Card>
                    </Box>
                )}
            </Draggable>
        );
    }
}

export default (withRouter(withStyles(styles)(Asset)));