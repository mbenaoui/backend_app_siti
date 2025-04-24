import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("visitors")
export class Visitor {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  company: string

  @Column()
  purpose: string

  @Column()
  date: string

  @Column()
  time: string

  @Column()
  contactPerson: string

  @Column({ nullable: true })
  badgeUrl: string

  @Column({ default: false })
  notificationSent: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
