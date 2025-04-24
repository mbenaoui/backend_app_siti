import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visitor } from './entities/visitor.entity';
import { VisitorService } from './visitor.service';
import { VisitorController } from './visitor.controller';
import { BadgeModule } from '../badge/badge.module';

@Module({
  imports: [TypeOrmModule.forFeature([Visitor]), BadgeModule],
  controllers: [VisitorController],
  providers: [VisitorService],
  exports: [VisitorService],
})
export class VisitorModule {}