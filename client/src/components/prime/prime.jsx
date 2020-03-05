import React, { Component, PureComponent } from 'react';
import Item from './item';
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import { 
    Card,
    Typography,
    Grid,
    Box,
    Button,
    Popover,
    Modal,
} from '@material-ui/core';
import { colors } from '../../theme/theme';

import { DragDropContext } from 'react-beautiful-dnd';
import initialData from './constants';
import Column from './column';
import Alert from '@material-ui/lab/Alert';

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

function SimplePopover(props) {
    const classes = props.classes;
    const [anchorEl, setAnchorEl] = React.useState(null);
  
    const handleClick = event => {
      setAnchorEl(event.currentTarget);
    };
  
    const handleClose = () => {
      setAnchorEl(null);
    };
  
    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;
  
    return (
      <div>
        <Button aria-describedby={id} variant="contained" color="primary" onClick={handleClick}>
          Open Popover
        </Button>
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Typography>The content of the Popover.</Typography>
        </Popover>
      </div>
    );
  }



class InnerList extends PureComponent {
    shouldComponentUpdate(nextProps) {
        if(
            nextProps.column === this.props.column &&
            nextProps.itemMap === this.props.itemMap &&
            nextProps.index === this.props.index
        ) {
            return false;
        }
        return true;
    }

    render() {
        const { 
            column, 
            itemMap, 
            index, 
            isDropDisabled, 
            boardItems, 
            handleUndo, 
            handleAdd,
            handleDelete,
        } = this.props;
        const items = column.itemIds.map(itemId => itemMap[itemId]);
        return <Column 
                    key={column.id} 
                    column={column} 
                    items={items} 
                    isDropDisabled={isDropDisabled} 
                    boardItems={boardItems}
                    handleUndo={handleUndo}
                    handleAdd={handleAdd}
                    handleDelete={handleDelete}
                    assetMap={this.props.assetMap}
                    expirationMap={this.props.expirationMap}
                />;
    }
}

class Prime extends Component {
    constructor(props){
        super()
        this.state = initialData;
        this.handleUndo = this.handleUndo.bind(this);
        this.handleAdd = this.handleAdd.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
    }

    onBeforeDragStart = start => {

    }

    onDragStart = start => {
        const homeIndex = this.state.columnOrder.indexOf(start.source.droppableId);
        const homeType = start.draggableId;
        this.setState({
            homeIndex,
            homeType,
        });
    };

    onDragUpdate = () => {

    };

    onDragEnd = result => {
        this.setState({
            homeIndex: null,
            homeType: null,
            disable: false,
            amount: null,
            asset: false,
        });

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
            const newItemIds = Array.from(start.itemIds);
            newItemIds.splice(source.index, 1);
            newItemIds.splice(destination.index, 0, draggableId);

            const newColumn = {
                ...start,
                itemIds: newItemIds,
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

        const startItemIds = Array.from(start.itemIds);
        startItemIds.splice(source.index, 1);
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };

        const finishItemIds = Array.from(finish.itemIds);
        finishItemIds.splice(destination.index, 0, draggableId);
        const newFinish = {
            ...finish,
            itemIds: finishItemIds,
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


        // GETS BOARD ITEMS AND PASSES TO DRAGGABLE COMPONENTS
        let boardItems = this.state.boardItems ? this.state.boardItems : [];
        if(destination.droppableId === 'board') {
            boardItems.push(draggableId);
            console.log('board items array', boardItems)
        }
        if(
            source.droppableId === 'board' &&
            destination.droppableId !== 'board'
        ) {
            let pos = boardItems.indexOf(draggableId);
            boardItems.splice(pos, 1);
            console.log('remove', boardItems)
        }
        this.setState({
            boardItems: boardItems,
        });
    };

    handleUndo = (itemId, columnId) => {
        // RETURN ITEM TO ORIGINAL POSITION
        let currentIndex = columnId;
        let initialIndex = this.state.items[itemId].index;

        if(currentIndex === initialIndex) {
            return;
        }

        const start = this.state.columns[columnId];
        const finish = this.state.columns[initialIndex];

        const startItemIds = Array.from(start.itemIds);
        startItemIds.splice(startItemIds.indexOf(itemId), 1);
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };

        const finishItemIds = Array.from(finish.itemIds);
        finishItemIds.push(itemId)
        const newFinish = {
            ...finish,
            itemIds: finishItemIds,
        };

        let boardItems = this.state.boardItems ? this.state.boardItems : [];
        boardItems.splice(boardItems.indexOf(itemId), 1);
        console.log(boardItems)

        const newState = {
            ...this.state,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
                [newFinish.id]: newFinish,
            },
        };
        this.setState(newState);
    }

    handleDelete = (itemId, columnId) => {
        // DELETE ITEM
        let currentIndex = columnId;

        const start = this.state.columns[columnId];

        const startItemIds = Array.from(start.itemIds);
        startItemIds.splice(startItemIds.indexOf(itemId), 1);
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };


        let boardItems = this.state.boardItems ? this.state.boardItems : [];
        boardItems.splice(boardItems.indexOf(itemId), 1);
        console.log(boardItems)

        const newState = {
            ...this.state,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
            },
        };
        this.setState(newState);
    }

    handleAdd = (itemId, columnId, address) => {
        if(columnId === 'address') {
            console.log(address)
            return;
        }


        let currentIndex = columnId;

        const start = this.state.columns[columnId];

        const startItemIds = Array.from(start.itemIds);
        const items = this.state.items;

        // IF ITEM IS IN COLUMN, DONT ADD ANOTHER
        function hasDuplicates(array) {
            var valuesSoFar = Object.create(null);
            for (var i = 0; i < array.length; ++i) {
                var value = array[i];
                if (value in valuesSoFar) {
                    console.log('DUPLICATES FOUND')
                    return true;
                }
                valuesSoFar[value] = true;
            }
            console.log('NO DUPLICATES FOUND')
            return false;
        }

        startItemIds.push(items[itemId].id);
        if(hasDuplicates(startItemIds)) {
            return;
        }
        const newStart = {
            ...start,
            itemIds: startItemIds,
        };

        const newState = {
            ...this.state,
            items: items,
            columns: {
                ...this.state.columns,
                [newStart.id]: newStart,
            },
        };
        this.setState(newState);
    }
    
    render() {
        const { classes } = this.props;
        return (
            <DragDropContext 
                onBeforeDragStart={this.onBeforeDragStart}
                onDragStart={this.onDragStart}
                onDragEnd={this.onDragEnd}
            >
                <Box className={classes.boards}>
                    {this.state.columnOrder.map((columnId, index) => {
                        const column = this.state.columns[columnId];
                        return (
                            <InnerList
                                key={column.id}
                                column={column}
                                itemMap={this.state.items}
                                index={index}
                                boardItems={this.state.boardItems}
                                handleUndo={this.handleUndo}
                                handleAdd={this.handleAdd}
                                handleDelete={this.handleDelete}
                                assetMap={this.state.assets}
                                expirationMap={this.state.expirations}
                            />
                                
                            
                        );
                    })}
                </Box>
            </DragDropContext>
            
        )
        
    }
}

export default (withRouter(withStyles(styles)(Prime)));