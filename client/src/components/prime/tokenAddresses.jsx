import React from 'react';
import Strike from '../../artifacts/Strike.json';
import Underlying from '../../artifacts/Underlying.json';

const NAME = 'name'
const SYMBOL = 'symbol'
const DECIMALS = 'decimals'
const ADDRESS = 'address'



const TOKENS_CONTEXT = {
    1: {

    },
    4: {
        'DAI': {
            [NAME]: 'Dai Multi-Collateral',
            [SYMBOL]: 'DAI',
            [DECIMALS]: 18,
            [ADDRESS]: '',
        },
        'U': {
            [NAME]: 'Test Collateral Token',
            [SYMBOL]: 'U',
            [DECIMALS]: 18,
            [ADDRESS]: Underlying.networks[4].address,
        },
        'S': {
            [NAME]: 'Test Payment Token',
            [SYMBOL]: 'S',
            [DECIMALS]: 18,
            [ADDRESS]: Strike.networks[4].address,
        },
    },
}

export default TOKENS_CONTEXT;