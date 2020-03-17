import React, { Component } from 'react';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import { Draggable } from 'react-beautiful-dnd';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import RestoreIcon from '@material-ui/icons/Restore';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';

const styles = theme => ({
    item: {
        flex: '1',
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
        backgroundColor: colors.primary,
        '&:hover': {
            backgroundColor: colors.lightSuccess,
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
        color: colors.banner,
    },
    onBoard: {
        backgroundColor: colors.green,
    },
});

class Expiration extends Component {
    constructor(props) {
        super(props);
        this.convertUnixTimestamp = this.convertUnixTimestamp.bind(this);
    }

    convertUnixTimestamp = (timestamp) => {
        const date = new Date(timestamp * 1000);
        const datetime = ((date.toDateString() + ' ' + date.toTimeString()).split('G'))[0];
        return datetime;
    };
    
    render() {
        const { classes, t, boardItems, item, index, handleUndo, column, handleDelete, isOnBoard } = this.props;
        let isDragDisabled = false;
        let onBoard = isOnBoard(item.id, column.id);

        return (
            /* ITEM CONTEXT */
            <Draggable 
                draggableId={item.id} 
                index={index}
                isDragDisabled={isDragDisabled}
            >

                {/* ITEM BODY */}
                {(provided, snapshot) => (
                    <Box
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        ref={provided.innerRef}
                        isDragging={snapshot.isDragging}
                    >

                        {/* ITEM CARD */}
                       <Card 
                            className={
                                (onBoard)
                                ? `${classes.item} ${classes.onBoard}`
                                    :  `${classes.item} ${classes.prime}`
                            }
                        >

                            {/* TITLE */}
                            <Typography variant={'h2'} className={`${classes.title}`}>
                                {this.convertUnixTimestamp(this.props.item.payload)}
                            </Typography>

                            {/* FUNCTIONS */}
                            <IconButton
                                color={colors.background}
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
    };
};

export default (withRouter(withStyles(styles)(Expiration)));