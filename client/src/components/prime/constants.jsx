const initialData = {
    tasks: {
        'task-1': {id: 'task-1', content: 'Task 1'},
        'task-2': {id: 'task-2', content: 'Task 2'},
        'task-3': {id: 'task-3', content: 'Task 3'},
    },
    columns: {
        'column-1': {
            id: 'column-1',
            title: 'Parameters',
            taskIds: ['task-1', 'task-2', 'task-3']
        },
        'column-2': {
            id: 'column-2',
            title: 'Board',
            taskIds: [],
        }
    },
    columnOrder: ['column-1', 'column-2'],
};

export default initialData;