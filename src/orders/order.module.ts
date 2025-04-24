import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { OrderController } from "./order.controller"
import { OrderService } from "./order.service"
import { OrderNotificationService } from "./order-notification.service"
import { Order } from "./entities/order.entity"
import { OrderItem } from "./entities/order-item.entity"
import { Partner } from "./entities/partner.entity"
import { UsersModule } from "../users/users.module"
import { ConfigModule } from "@nestjs/config"

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Partner]), UsersModule, ConfigModule],
  controllers: [OrderController],
  providers: [OrderService, OrderNotificationService],
  exports: [OrderService],
})
export class OrdersModule {}
