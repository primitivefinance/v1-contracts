import React from 'react'

import Card from '../../../../components/Card'
import CardContent from '../../../../components/CardContent'
import CardTitle from '../../../../components/CardTitle'

import useOrders from '../../../../hooks/useOrders'

import EmptyContent from './components/EmptyContent'

interface OrderCardProps {}

const OrderCard: React.FC<OrderCardProps> = (props) => {
    const { items } = useOrders()
    return (
        <Card>
            <CardTitle>Your Order</CardTitle>
            <CardContent>
                {!items.length && <EmptyContent />}
            </CardContent>
        </Card>
    )
}

export default OrderCard