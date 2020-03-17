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
import AddForm from './addForm';

const styles = theme => ({
    board: {
        display: 'flex',
        margin: '16px',
        marginRight: '32px',
        width: '20%',
        height: '20%',
        minWidth: '10%',
        minHeight: '10%',
        flexDirection: 'row',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'column',
        },
        borderRadius: '0px',
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
    },
    prime: {
        backgroundColor: colors.banner,
        '&:hover': {
            backgroundColor: colors.highlight,
            '& .title': {
                color: colors.primary
            },
            '& .icon': {
                color: colors.primary
            },
        },
        '& .title': {
            color: colors.primary,
            fontWeight: '600',
        },
        '& .icon': {
            color: colors.primary
        }
    },
    title: {
        display: 'flex',
        padding: '16px',
        paddingBottom: '0px',
        justifyContent: 'center',
        fontWeight: '600',
        [theme.breakpoints.up('sm')]: {
            paddingBottom: '8px'
        },
        backgroundColor: colors.banner,
    },
    addButtons: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        backgroundColor: colors.banner,
    },

    /* <AddForm/> DEPENDENCY CLASSES */
    iconButton: {
        color: colors.success,
        backgroundColor: 'transparent',
        opacity: '100%',
        '&:hover': {
            color: colors.lightgreen,
            backgroundColor: 'transparent',
        },
        borderRadius: '0%',
    },
    select: {
        display: 'flex',
        width: '100%',
    },
    formControl: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        '&:hover': {
            backgroundColor: colors.lightblue,
        },
        border: '0px',
        color: colors.primary,
    },
    inputLabel: {
        bottomBorder: '0px',
    },
    menuItem: {
        backgroundColor: props => props.isDuplicate ? colors.palered : colors.lightblue,
        color: colors.primary,
        backgroundColor: colors.background,
        '&:hover': {
            color: colors.primary,
            backgroundColor: colors.background,
        },
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
        const { boardItems, column, handleUndo, handleDelete } = this.props;
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
            isDropDisabled,
            column, 
            handleUndo, 
            handleAdd,
            handleDelete,
            items,
            assetMap,
            expirationMap,
            boardItems,
        } = this.props;

        let assetForm = <AddForm
                            items={items}
                            columnId={'start'}
                            name={'asset'}
                            handleAddForm={this.handleAddForm}
                            classes={classes}
                            assetMap={assetMap}
                            expirationMap={expirationMap}
                        />
        let expirationForm =    <AddForm
                                    items={items}
                                    columnId={'start'}
                                    name={'expiration'}
                                    handleAddForm={this.handleAddForm}
                                    classes={classes}
                                    assetMap={assetMap}
                                    expirationMap={expirationMap}
                                />
        let addressForm =   <AddForm
                                items={items}
                                columnId={'address'}
                                name={'address'}
                                handleAddForm={this.handleAddForm}
                                classes={classes}
                                assetMap={assetMap}
                                expirationMap={expirationMap}
                            />

        return(
            /* BOARD CONTAINER */
            <Card className={`${classes.board} ${classes.prime}`}>
                    
                {/* BOARD TITLE */}
                <Typography variant={'h1'} className={`${classes.title} title`}>
                    {column.title}
                </Typography>

                {/* BOARD CONTENT */}
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

                {/* ADD BUTTONS */}
                <Box className={classes.addButtons}>
                    {assetForm}
                    {expirationForm}
                    {/* {addressForm} */}
                </Box>

            </Card>
        );
    };
};

export default withStyles(styles)(Column);