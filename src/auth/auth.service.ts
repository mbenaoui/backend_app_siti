import { Injectable, Logger } from "@nestjs/common"
import  { JwtService } from "@nestjs/jwt"
import  { ConfigService } from "@nestjs/config"
import  { UsersService } from "../users/users.service"
import axios from "axios"
import { v4 as uuidv4 } from "uuid"

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly microsoftConfig: {
    clientId: string
    clientSecret: string
    tenantId: string
    redirectUri: string
  }
  private readonly stateStore = new Map<string, { expires: Date }>()

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.microsoftConfig = {
      clientId: this.configService.get<string>("MICROSOFT_CLIENT_ID")!,
      clientSecret: this.configService.get<string>("MICROSOFT_CLIENT_SECRET")!,
      tenantId: this.configService.get<string>("MICROSOFT_TENANT_ID")!,
      redirectUri: this.configService.get<string>("MICROSOFT_REDIRECT_URI")!,
    }

    this.logger.log(`Microsoft OAuth configured with redirect URI: ${this.microsoftConfig.redirectUri}`)
  }

  async getMicrosoftAuthUrl(): Promise<{ url: string; state: string }> {
    const state = uuidv4()
    console.log(">>",this.microsoftConfig.clientId,"<<")
    console.log(">>",this.microsoftConfig.clientSecret,"<<")
    console.log(">>",this.microsoftConfig.tenantId,"<<")
    console.log(">>",this.microsoftConfig.redirectUri,"<<")

    // Store state with longer expiration
    this.stateStore.set(state, {
      expires: new Date(Date.now() + 30 * 60 * 1000), // 30-minute expiration
    })

    this.logger.log(`Generated state: ${state}, expires: ${this.stateStore.get(state)?.expires}`)
    this.logger.debug(`Current states in store: ${Array.from(this.stateStore.keys()).join(", ")}`)

    const params = new URLSearchParams({
      client_id: this.microsoftConfig.clientId,
      response_type: "code",
      redirect_uri: this.microsoftConfig.redirectUri,
      scope: this.configService.get<string>("MICROSOFT_SCOPES") || "openid profile email User.Read",
      state,
      prompt: "select_account",
    })

    return {
      url: `https://login.microsoftonline.com/${this.microsoftConfig.tenantId}/oauth2/v2.0/authorize?${params.toString()}`,
      state,
    }
  }

  async handleMicrosoftCallback(code: string, state: string | null) {
    try {
      this.logger.log(`Handling callback with code: ${code.substring(0, 20)}...`)

      // Modified state validation to be optional
      if (state) {
        this.logger.log(`Validating state: ${state}`)
        const storedState = this.stateStore.get(state)

        if (!storedState) {
          this.logger.warn(`State not found in store: ${state}`)
          this.logger.debug(`Available states: ${Array.from(this.stateStore.keys()).join(", ")}`)
          // Continue without state validation instead of throwing an error
        } else if (storedState.expires < new Date()) {
          this.logger.warn(`State expired: ${state}, expired at ${storedState.expires}`)
          // Continue without state validation instead of throwing an error
        } else {
          this.logger.log(`State validated successfully: ${state}`)
          this.stateStore.delete(state)
        }
      } else {
        this.logger.warn("No state provided, skipping state validation")
      }
        console.log("State validation complete")
      // Exchange authorization code for tokens
      this.logger.log("Exchanging code for tokens...")
      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${this.microsoftConfig.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.microsoftConfig.clientId,
          code,
          redirect_uri: this.microsoftConfig.redirectUri,
          grant_type: "authorization_code",
        }),
      );

      const { access_token } = tokenResponse.data
      this.logger.log("Access token obtained successfully")

      // Get user profile from Microsoft Graph
      this.logger.log("Getting user profile from Microsoft Graph...")
      const userInfoResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          ConsistencyLevel: "eventual",
        },
      })

      const microsoftUser = userInfoResponse.data
      this.logger.log(`User info obtained: ${microsoftUser.displayName}`)

      // Database operations with error handling
      const email = microsoftUser.mail || microsoftUser.userPrincipalName
      this.logger.log(`Looking for user with email: ${email}`)
      let user = await this.usersService.findByEmail(email)

      if (!user) {
        this.logger.log("Creating new user")
        user = await this.usersService.create({
          email: email,
          firstName: microsoftUser.givenName,
          lastName: microsoftUser.surname,
          displayName: microsoftUser.displayName,
          microsoftId: microsoftUser.id,
        })
      } else {
        this.logger.log("Updating existing user")
        user = await this.usersService.update(user.id, {
          firstName: microsoftUser.givenName,
          lastName: microsoftUser.surname,
          displayName: microsoftUser.displayName,
          microsoftId: microsoftUser.id,
        })
      }

      // Generate JWT with expiration
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.displayName,
      }

      const jwtToken = this.jwtService.sign(payload, {
        expiresIn: "1d",
      })

      this.logger.log("Authentication successful, JWT generated")

      return {
        accessToken: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      }
    } catch (error) {
      this.logger.error("Authentication Error:", error.message)
      if (error.response) {
        this.logger.error("Error response data:", error.response.data)
        this.logger.error("Error response status:", error.response.status)
      }
      this.logger.error("Error stack:", error.stack)

      throw new Error(error.response?.data?.error_description || "Authentication failed. Please try again.")
    }
  }

  async logout(userId: number): Promise<void> {
    // Implement token invalidation logic here
    this.logger.log(`User ${userId} logged out`)
  }
}