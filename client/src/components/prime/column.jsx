import React, { Component, PureComponent } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { withStyles } from '@material-ui/core/styles';
import { colors } from '../../theme/theme';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Asset from './asset';
import Expiration from './expiration';
import Address from './address';


const styles = theme => ({
    board: {
        display: 'flex',
        margin: '16px',
        width: '90%',
        height: '30%',
        minWidth: '10%',
        minHeight: '10%',
        flexWrap: 'wrap',
        flexDirection: 'row',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
            width: '30%',
        },
    },
    list: {
        padding: '16px',
        minHeight: '10vh',
        minWidth: '30vh',
        backgroundColor: colors.secondary,
        '&:hover': {
            backgroundColor: colors.highlight,
        },
        [theme.breakpoints.up('sm')]: {
            minWidth: '10vh',
        },
        borderColor: colors.primary,
    },
    prime: {
        backgroundColor: colors.background,
        '&:hover': {
            '& .title': {
                color: colors.primary
            },
            '& .icon': {
                color: colors.blue
            },
        },
        '& .title': {
            color: colors.primary,
            fontWeight: '600',
        },
        '& .icon': {
            color: colors.blue
        }
    },
    title: {
        padding: '16px',
        paddingBottom: '0px',
        justifyContent: 'center',
        alignItems: 'center',
        fontWeight: '500',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '8px'
        },
        backgroundColor: colors.banner,
        color: colors.primary,
        display: 'flex',
        justifyContent: 'space-evenly',
    },

});

class InnerList extends PureComponent {
    shouldComponentUpdate(nextProps) {
        if(nextProps.items === this.props.items) {
            return false;
        }
        return true;
    }

    render () {
        const { boardItems, column, handleUndo, handleDelete, isDragDisabled } = this.props;
        return (
            this.props.items.map((item, index) => {
                let _item = (item.id).split('-')[0];
                switch(_item) {
                    case 'asset':
                        return (
                            <Asset 
                                key={item.id} 
                                item={item} 
                                index={index} 
                                boardItems={boardItems}
                                column={column}
                                handleUndo={handleUndo}
                                handleDelete={handleDelete}
                                isOnBoard={this.props.isOnBoard}
                            />
                        );
                        break;
                    case 'expiration':
                        return (
                            <Expiration 
                                key={item.id} 
                                item={item} 
                                index={index} 
                                boardItems={boardItems}
                                column={column}
                                handleUndo={handleUndo}
                                handleDelete={handleDelete}
                                isOnBoard={this.props.isOnBoard}
                            />
                        );
                        break;
                    case 'address':
                        return (
                            <Address 
                                key={item.id} 
                                item={item} 
                                index={index} 
                                boardItems={boardItems}
                                column={column}
                                handleUndo={handleUndo}
                                handleDelete={handleDelete}
                                isOnBoard={this.props.isOnBoard}
                            />
                        );
                        break;
                };
            })
        );
    };
};

class Column extends Component {
    constructor(props) {
        super(props)
        this.handleAddForm = this.handleAddForm.bind(this);
        this.handleBoard = this.handleBoard.bind(this);
    }

    handleAddForm = (symbol, columnId, address) => {
        this.props.handleAdd(symbol, columnId, address);
    }

    handleBoard = (columnId) => {
        this.props.handleBoardSubmit(columnId);
    }

    render() {
        const { 
            classes,
            column,
            items,
            boardItems,
            isDropDisabled,
            handleUndo, 
            handleAdd,
            handleDelete,
        } = this.props;
        return(
            /* CELL CONTAINER */
            <Card className={`${classes.board} ${classes.prime}`}>
                
                {/* TITLES */}
                <Typography variant={'h1'} className={`${classes.title} title`}>
                    {column.title}
                </Typography>
                
                {/* CELL CONTENT */}
                <Droppable 
                    droppableId={column.id}
                    isDropDisabled={isDropDisabled}
                >
                    {(provided) => (
                        <>
                        <Box
                            className={classes.list}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            <InnerList
                                items={items}
                                boardItems={boardItems}
                                column={column}
                                handleUndo={handleUndo}
                                handleAdd={handleAdd}
                                handleDelete={handleDelete}
                                isOnBoard={this.props.isOnBoard}
                            />
                            {provided.placeholder}
                        </Box>
                        </>
                    )}
                </Droppable>
            </Card>
        );
    };
};

export default withStyles(styles)(Column);