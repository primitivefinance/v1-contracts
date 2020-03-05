const INITIAL_CONTEXT = {
    items: {
        'asset-dai': {id: 'asset-dai', content: 'DAI', type: 'asset', index: 'asset'},
        'expiration-2': {id: 'expiration-2', content: 'expiration 2', type: 'expiration', index: 'expiration', payload: '1583430138',},
        'address-3': {id: 'address-3', content: 'address 3', type: 'address', index: 'address', payload: 'carbonprotocol.eth',},
        'asset-mkr': {id: 'asset-mkr', content: 'MKR', type: 'asset', index: 'asset', payload: '0xMAKER',},
        'asset-snx': {id: 'asset-snx', content: 'SNX', type: 'asset', index: ''},
    },
    assets: {
        'assetIds' : ['asset-snx', 'asset-dai', 'asset-mkr',],
        'asset-snx': {id: 'asset-snx', content: 'SNX', type: 'asset', index: 'asset'},
        'asset-dai': {id: 'asset-dai', content: 'DAI', type: 'asset', index: 'asset'},
        'asset-mkr': {id: 'asset-mkr', content: 'MKR', type: 'asset', index: 'asset'},
    },
    expirations: {
        'expirationIds': ['expiration-2'],
        'expiration-2': {id: 'expiration-2', content: 'expiration 2', type: 'expiration', index: 'expiration',},
    },
    addresses: {
        'addressIds': ['address-3'],
        'address-3': {id: 'address-3', content: 'address 3', type: 'address', index: 'address',},
    },
    columns: {
        'asset': {
            id: 'asset',
            title: 'Assets',
            itemIds: ['asset-dai', 'asset-mkr',],
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

export default INITIAL_CONTEXT;