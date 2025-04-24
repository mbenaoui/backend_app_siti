import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

const server = express();

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );
  
  // Enable CORS
  app.enableCors();
  
  // Set global prefix if needed
  // app.setGlobalPrefix('api');
  
  await app.init();
}

bootstrap();

// Export express instance for serverless
export default server;