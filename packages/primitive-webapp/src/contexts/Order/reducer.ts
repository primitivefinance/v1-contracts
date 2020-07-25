import { OrderItem, OrderState } from './types'

const ADD_ITEM = 'ADD_ITEM'
const REMOVE_ITEM = 'REMOVE_ITEM'

export interface AddItemAction {
    type: typeof ADD_ITEM,
    item: OrderItem
}

export interface RemoveItemAction {
    type: typeof REMOVE_ITEM
}

export type OrderAction = AddItemAction | RemoveItemAction

export const addItem = (item: OrderItem): AddItemAction => ({
    type: ADD_ITEM,
    item,
})

export const removeItem = (): RemoveItemAction => ({
    type: REMOVE_ITEM,
})

export const initialState = {
    items: []
}

const reducer = (state: OrderState = initialState, action: OrderAction) => {
    switch (action.type) {
        case ADD_ITEM:
            return {
                ...state,
                items: [...state.items, action.item]
            }
        case REMOVE_ITEM:
            return state
        default:
            return state
    }
}

export default reducer