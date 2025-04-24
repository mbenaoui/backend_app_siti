import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config"; // Make sure to import ConfigModule
import { NotificationsService } from "./notifications.service";

@Module({
  // imports: [ConfigModule], // Import ConfigModule to provide ConfigService
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}