import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm"
import { Order } from "./order.entity"

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  productName: string

  @Column()
  quantity: number

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice: number

  @Column({ nullable: true })
  justification: string

  @Column()
  orderId: number

  @ManyToOne(
    () => Order,
    (order) => order.items,
  )
  @JoinColumn({ name: "orderId" })
  order: Order
}
