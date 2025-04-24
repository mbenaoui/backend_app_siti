import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { VisitorController } from "./visitors/visitor.controller";
import { VisitorService } from "./visitors/visitor.service";
import { OrderController } from "./orders/order.controller";
import { OrderService } from "./orders/order.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { BadgeModule } from "./badge/badge.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { Visitor } from "./visitors/entities/visitor.entity"; // Make sure to import your Visitor entity
import { OrdersModule } from "./orders/order.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DB_HOST"),
        port: configService.get("DB_PORT"),
        username: configService.get("DB_USERNAME"),
        password: configService.get("DB_PASSWORD"),
        database: configService.get("DB_DATABASE"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: configService.get("NODE_ENV") !== "production",
        ssl:
          configService.get("DB_SSL") === "true"
            ? {
                rejectUnauthorized: false,
              }
            : false,
      }),
    }),
    // Add this to make VisitorRepository available
    TypeOrmModule.forFeature([Visitor]),
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: { expiresIn: "1d" },
      }),
    }),
    AuthModule,
    OrdersModule,
    BadgeModule,
    NotificationsModule,
  ],
  controllers: [AppController, VisitorController ],
  providers: [AppService, VisitorService ],
})
export class AppModule {}