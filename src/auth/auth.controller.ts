import { Controller, Get, Post, Req, Body, UseGuards, Logger } from "@nestjs/common"
import { AuthService } from "./auth.service"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(private readonly authService: AuthService) {}

  @Get("microsoft/url")
  async getMicrosoftAuthUrl() {
    this.logger.log("Getting Microsoft auth URL")
    console.log(">>","xxxxxxxxxx","<<")
    const { url, state } = await this.authService.getMicrosoftAuthUrl()
    this.logger.log(`Microsoft auth URL generated with state: ${state}`)
    return { url, state }
  }

  @Post('microsoft/callback')
  async microsoftCallback(@Body() body: { code: string, state?: string }) {
    // this.logger.log(`Received callback with code: ${body.code.substring(0, 20)}...`)
    
    // if (!body.code) {
    //   this.logger.error("No code provided in callback")
    //   throw new Error("No authorization code provided")
    // }
    
    // // Make state optional and log whether it's present
    // if (body.state) {
    //   this.logger.log(`Received state: ${body.state}`)
    // } else {
    //   this.logger.warn("No state provided in callback, proceeding without state validation")
    // }
    
    // Pass the state if available, otherwise pass null
    return this.authService.handleMicrosoftCallback(body.code, body.state || "")
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req) {
    const userId = req.user.id
    this.logger.log(`Logging out user ${userId}`)
    await this.authService.logout(userId)
    return { success: true }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    this.logger.log(`Getting profile for user ${req.user.id}`)
    return req.user
  }
}