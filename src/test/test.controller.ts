import { Controller, Get } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Get()
  getHello(): { message: string } {
    return { message: 'Hello from NestJS on Vercel!' };
  }
}
