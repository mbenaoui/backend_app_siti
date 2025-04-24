export class OrderItemDto {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  unit?: string
  justification?: string
}

export class CreateOrderDto {
  partnerId: string
  supplier?: string
  items: OrderItemDto[] // Make sure items is required and properly typed
  justification?: string
  userId?: string
  userName?: string
  userEmail?: string
}

export class UpdateOrderStatusDto {
  status: string
}
