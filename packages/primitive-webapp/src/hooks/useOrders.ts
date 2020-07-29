import { useContext } from 'react'

import { OrderContext } from '../contexts/Order'

const useOrders = () => {
    return useContext(OrderContext)
}

export default useOrders