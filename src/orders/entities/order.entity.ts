import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { OrderItem } from "./order-item.entity"

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  reference: string

  @Column({ type: "date" })
  orderDate: Date

  @Column()
  status: string

  @Column()
  supplier: string

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAmount: number

  @Column({ nullable: true })
  userId: number

  @OneToMany(
    () => OrderItem,
    (item) => item.order,
  )
  items: OrderItem[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
