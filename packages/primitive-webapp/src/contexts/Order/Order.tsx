import React, { useCallback, useReducer } from 'react'

import OrderContext from './context'

import reducer, {
    addItem,
    initialState,
    removeItem,
} from './reducer'

import { OrderItem } from './types'

const Order: React.FC = (props) => {
    const [state, dispatch] = useReducer(reducer, initialState)

    const handleAddItem = useCallback((item: OrderItem) => {
        dispatch(addItem(item))
    }, [dispatch])

    const handleRemoveItem = useCallback(() => {
        dispatch(removeItem())
    }, [dispatch])

    return (
        <OrderContext.Provider value={{
            items: state.items,
            onAddItem: handleAddItem,
            onRemoveItem: handleRemoveItem,
        }}>
            {props.children}
        </OrderContext.Provider>
    )
}

export default Order