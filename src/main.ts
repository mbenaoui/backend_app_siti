import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { ValidationPipe } from "@nestjs/common"
import express from "express" // Correct import for Express

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
// Create a simple Express app for handling requests
const expressApp = express()

// Cache the NestJS app instance
let cachedApp: any = null

async function createApp() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule)

    app.enableCors({
      origin: true,
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,
    })

    app.useGlobalPipes(new ValidationPipe())

    await app.init()
    cachedApp = app
  }
  return cachedApp
}

// Export the handler function for Vercel
export default async function handler(req: any, res: any) {
  try {
    const app = await createApp()
    const server = app.getHttpAdapter().getInstance()
    server(req, res)
  } catch (error) {
    console.error("Serverless function error:", error)
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}
