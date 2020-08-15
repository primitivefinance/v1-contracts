import { createContext } from 'react'

import { OrderContextValues, OrderItem } from './types'

const OrderContext = createContext<OrderContextValues>({
    items: [],
    onAddItem: (item: OrderItem) => {},
    onRemoveItem: () => {},
})

export default OrderContext