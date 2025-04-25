import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { ValidationPipe } from "@nestjs/common"
import * as express from "express"

// For local development
async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })

  app.useGlobalPipes(new ValidationPipe())

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`Application is running on: http://localhost:${port}`)
}

// Only run in development mode
if (process.env.NODE_ENV !== "production") {
  bootstrap()
}

// For Vercel serverless deployment
const server = express()
let app: any

async function createApp(): Promise<any> {
  const nestApp = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] })

  nestApp.enableCors({
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })

  nestApp.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  await nestApp.init()
  return nestApp
}

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      app = await createApp()
    }

    // Handle the request
    const expressInstance = app.getHttpAdapter().getInstance()
    expressInstance(req, res)
  } catch (error) {
    console.error("Serverless function error:", error)
    res.status(500).send({
      error: "Internal Server Error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}
