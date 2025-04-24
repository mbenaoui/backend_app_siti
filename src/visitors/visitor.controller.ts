import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { VisitorService } from './visitor.service';
import { CreateVisitorDto } from './visitor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { console } from 'inspector';
import { ValidateBadgeDto } from '../badge/dto/validate-badge.dto';

@Controller('visitors')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Get()
  async getVisitors(
    @Query('search') search: string,
    @Query('sortBy') sortBy: string = 'date',
    @Query('order') order: 'asc' | 'desc' = 'desc',
  ) {
    return this.visitorService.getVisitors(search, sortBy, order);
  }

  @Post()
  create(@Body() createVisitorDto: CreateVisitorDto) {
    return this.visitorService.create(createVisitorDto);
  }

  @Get()
  findAll() {
    return this.visitorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.visitorService.findOne(+id);
  }
  @UseGuards(JwtAuthGuard)
  @Post('validate-badge')
  async validateBadge(@Body() validateBadgeDto: ValidateBadgeDto) {
    return this.visitorService.validateBadge(validateBadgeDto.badgeCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/badge')
  async generateBadge(@Param('id') id: string) {
    const badgeUrl = await this.visitorService.generateBadge(+id);
    return { badgeUrl };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/notify')
  async notifySecurity(@Param('id') id: string) {
    console.log(`Notifying security for visitor ID: ${id}`);
    await this.visitorService.notifySecurity(+id);
    return { success: true };
  }
}
