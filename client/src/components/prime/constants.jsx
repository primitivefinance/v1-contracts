const initialData = {
    items: {
        'asset-1': {id: 'asset-1', content: 'DAI', type: 'asset', index: 'asset'},
        'expiration-2': {id: 'expiration-2', content: 'expiration 2', type: 'expiration', index: 'expiration',},
        'address-3': {id: 'address-3', content: 'address 3', type: 'address', index: 'address',},
        'asset-2': {id: 'asset-2', content: 'MKR', type: 'asset', index: 'asset'},
    },
    columns: {
        'asset': {
            id: 'asset',
            title: 'Assets',
            itemIds: ['asset-1', 'asset-2',],
            board: false,
        },
        'board': {
            id: 'board',
            title: 'Board',
            itemIds: [],
            board: true,
        },
        'expiration': {
            id: 'expiration',
            title: 'Expiration Dates',
            itemIds: ['expiration-2',],
            board: false,
        },
        'address': {
            id: 'address',
            title: 'Addresses',
            itemIds: ['address-3'],
            board: false,
        },
    },
    columnOrder: ['asset', 'expiration', 'address', 'board',],
};

export default initialData;