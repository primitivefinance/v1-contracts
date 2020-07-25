export interface OrderContextValues {
    items: OrderItem[],
    onAddItem: (item: OrderItem) => void,
    onRemoveItem: () => void
}

export interface OrderItem {}

export interface OrderState {
    items: OrderItem[]
}