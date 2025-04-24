import { Module } from "@nestjs/common"
import { BadgeService } from "./badge.service"
import { NotificationsModule } from "../notifications/notifications.module"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Visitor } from "../visitors/entities/visitor.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Visitor]), NotificationsModule],
  providers: [BadgeService],
  exports: [BadgeService],
})
export class BadgeModule {}
