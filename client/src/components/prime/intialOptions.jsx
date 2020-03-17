const INITIAL_OPTIONS = {
    assets: {
        'assetIds' : ['asset-dai', 'asset-tUSD', 'asset-tETH',],
        'asset-dai': {
                        id: 'asset-dai', 
                        content: 'DAI', 
                        type: 'asset', 
                        payload: 'DAI',
                    },
        'asset-tUSD': {
                        id: 'asset-tUSD', 
                        content: 'tUSD', 
                        type: 'asset', 
                        payload: 'tUSD',
                    },
        'asset-tETH': {
                        id: 'asset-tETH', 
                        content: 'tETH', 
                        type: 'asset', 
                        payload: 'tETH',
                    },
    },
    expirations: {
        'expirationIds': ['expiration-may', 'expiration-june', 'expiration-september', 'expiration-december',],
        'expiration-may': {
            id: 'expiration-may', 
            content: 'May 15, 2020, 11:59pm UTC', 
            type: 'expiration', 
            payload: '1589587185',
        },
        'expiration-june': {
            id: 'expiration-june', 
            content: 'June 19, 2020, 11:59pm UTC', 
            type: 'expiration', 
            payload: '1592611185',
        },
        'expiration-september': {
            id: 'expiration-september', 
            content: 'September 18, 2020, 11:59pm UTC', 
            type: 'expiration', 
            payload: '1600473585',
        },
        'expiration-december': {
            id: 'expiration-december', 
            content: 'December 18, 2020, 11:59pm UTC', 
            type: 'expiration', 
            payload: '1608335985',
        },
    },
};

export default INITIAL_OPTIONS;
