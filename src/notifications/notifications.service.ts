import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer"

interface SecurityNotificationData {
  visitorId: number
  visitorName: string
  company: string
  date: string
  time: string
  contactPerson: string  
}

@Injectable()
export class NotificationsService {
  private readonly emailTransporter
  private readonly securityEmail: string
  private readonly fromEmail: string

  constructor(private readonly configService: ConfigService) {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: this.configService.get<string>("SMTP_HOST"),
      port: this.configService.get<number>("SMTP_PORT"),
      secure: this.configService.get<boolean>("SMTP_SECURE"),
      auth: {
        user: this.configService.get<string>("SMTP_USER"),
        pass: this.configService.get<string>("SMTP_PASSWORD"),
      },
    })

    this.securityEmail = this.configService.get<string>("SECURITY_EMAIL")!
    this.fromEmail = this.configService.get<string>("FROM_EMAIL")!
  }

  async sendSecurityNotification(data: SecurityNotificationData): Promise<void> {
    const { visitorId, visitorName, company, date, time, contactPerson } = data

    // Email notification
    await this.emailTransporter.sendMail({
      from: this.fromEmail,
      to: this.securityEmail,
      subject: `Notification de visite - ${visitorName}`,
      html: `
        <h2>Notification de visite</h2>
        <p>Un nouveau visiteur est attendu:</p>
        <ul>
          <li><strong>Nom:</strong> ${visitorName}</li>
          <li><strong>Entreprise:</strong> ${company}</li>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Heure:</strong> ${time}</li>
          <li><strong>Contact interne:</strong> ${contactPerson}</li>
          <li><strong>ID Visiteur:</strong> ${visitorId}</li>
        </ul>
        <p>Veuillez préparer l'accès pour ce visiteur.</p>
      `,
    })

    console.log(`Security notification sent for visitor ${visitorId}`)
  }
}
