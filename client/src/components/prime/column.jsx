import React, { Component, PureComponent } from 'react';
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
import Asset from './asset';
import Expiration from './expiration';
import Address from './address';

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


class InnerList extends PureComponent {
    shouldComponentUpdate(nextProps) {
        if(nextProps.items === this.props.items) {
            return false;
        }
        return true;
    }

    render () {
        const { boardItems, handleDelete, column } = this.props;
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
                                handleDelete={handleDelete}
                                column={column}
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
                                handleDelete={handleDelete}
                                column={column}
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
                                handleDelete={handleDelete}
                                column={column}
                            />
                        );
                        break;
                }
            })
        );
    }
}

class Column extends Component {
    render() {
        const { classes, handleDelete, column } = this.props;
        return(
            <Card className={`${classes.board} ${classes.prime}`}>
                <Typography variant={'h1'} className={`${classes.title} title`}>
                    {this.props.column.title}
                </Typography>
                <Droppable 
                    droppableId={this.props.column.id}
                    isDropDisabled={this.props.isDropDisabled}
                >
                    {(provided) => (
                        <>
                        <Box
                            className={classes.list}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            <InnerList 
                                items={this.props.items}
                                boardItems={this.props.boardItems} 
                                handleDelete={handleDelete}
                                column={column}
                            />
                            {provided.placeholder}
                        </Box>
                        </>
                    )}
                </Droppable>
            </Card>
        );
    }
}

export default withStyles(styles)(Column);