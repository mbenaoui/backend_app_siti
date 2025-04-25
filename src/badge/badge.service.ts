import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import  { ConfigService } from "@nestjs/config"
import { InjectRepository } from "@nestjs/typeorm"
import  { Repository } from "typeorm"
import { Visitor } from "../visitors/entities/visitor.entity"
import  { NotificationsService } from "../notifications/notifications.service"
import PDFDocument from "pdfkit"
import * as fs from "fs"
import * as path from "path"
import * as QRCode from "qrcode"

@Injectable()
export class BadgeService {
  [x: string]: any
  private readonly uploadDir: string
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(Visitor)
    private visitorsRepository: Repository<Visitor>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.baseUrl = this.configService.get<string>('BASE_URL') || '';

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async generateBadge(visitorId: number): Promise<string> {
    // Get visitor data
    const visitor = await this.visitorsRepository.findOne({ where: { id: visitorId } })

    if (!visitor) {
      throw new Error("Visitor not found")
    }

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(
      JSON.stringify({
        id: visitor.id,
        name: visitor.name,
        company: visitor.company,
        date: visitor.date,
      }),
    )

    // Create PDF badge
    const badgeFileName = `badge_${visitor.id}_${Date.now()}.pdf`
    const badgeFilePath = path.join(this.uploadDir, badgeFileName)

    const doc = new PDFDocument({
      size: "A6",
      margin: 10,
    })

    const writeStream = fs.createWriteStream(badgeFilePath)
    doc.pipe(writeStream)

    // Add company logo
    const logoPath = path.join(process.cwd(), "assets", "logo.png")
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 10, 10, { width: 50 })
    }

    // Add title
    doc.fontSize(18).text("BADGE VISITEUR", 70, 20, { align: "center" })
    doc.moveDown()
    doc
      .moveTo(10, 50)
      .lineTo(doc.page.width - 10, 50)
      .stroke()

    // Add visitor info
    doc.moveDown()
    doc.fontSize(16).text(visitor.name, { align: "center" })
    doc.fontSize(14).text(visitor.company, { align: "center" })
    doc.moveDown()

    // Add visit details
    doc.fontSize(12).text(`Date: ${visitor.date}`)
    doc.fontSize(12).text(`Heure: ${visitor.time}`)
    doc.fontSize(12).text(`Contact: ${visitor.contactPerson}`)
    doc.moveDown()

    // Add QR code
    const qrImage = Buffer.from(qrCodeDataUrl.split(",")[1], "base64")
    doc.image(qrImage, (doc.page.width - 100) / 2, doc.y, { width: 100 })

    // Add visitor ID
    doc.moveDown()
    doc.fontSize(10).text(`ID: V-${visitor.id}`, { align: "center" })

    // Finalize PDF
    doc.end()

    // Wait for the file to be written
    await new Promise<void>((resolve) => {
      writeStream.on("finish", () => {
        resolve()
      })
    })

    // Update visitor with badge URL
    const badgeUrl = `${this.baseUrl}/uploads/${badgeFileName}`
    await this.visitorsRepository.update(visitorId, { badgeUrl })

    return badgeUrl
  }
// backend/src/badge/badge.service.ts
// Add this method to your existing BadgeService class

async validateBadge(badgeCode: string): Promise<any> {
  try {
    this.logger.log(`Validating badge with code: ${badgeCode}`);
    
    // Parse the badge code (assuming it's a JSON string)
    let badgeData;
    try {
      badgeData = JSON.parse(badgeCode);
    } catch (e) {
      this.logger.error(`Invalid badge code format: ${e.message}`);
      throw new BadRequestException('Format de code QR invalide');
    }
    
    // Check if the badge contains a visitor ID
    if (!badgeData.id) {
      this.logger.error('Badge code does not contain visitor ID');
      throw new BadRequestException('Code QR invalide: ID visiteur manquant');
    }
    
    // Find the visitor in the database
    const visitor = await this.visitorsRepository.findOne({ 
      where: { id: badgeData.id } 
    });
    
    if (!visitor) {
      this.logger.error(`Visitor with ID ${badgeData.id} not found`);
      throw new NotFoundException('Visiteur non trouvé');
    }
    
    // Check if the badge is valid (you can add more validation logic here)
    const isValid = this.isBadgeValid(visitor, badgeData);
    
    // Return visitor data with validation result
    return {
      isValid,
      id: visitor.id,
      name: visitor.name,
      company: visitor.company,
      date: visitor.date,
      time: visitor.time,
      contactPerson: visitor.contactPerson,
      purpose: visitor.purpose,
      badgeUrl: visitor.badgeUrl,
      notificationSent: visitor.notificationSent,
    };
  } catch (error) {
    this.logger.error(`Error validating badge: ${error.message}`);
    throw error;
  }
}

private isBadgeValid(visitor: Visitor, badgeData: any): boolean {
  // Implement your validation logic here
  // For example, check if the badge is not expired, if the visitor data matches, etc.
  
  // Example: Check if the name and company match
  const nameMatches = visitor.name === badgeData.name;
  const companyMatches = visitor.company === badgeData.company;
  
  // Example: Check if the visit date is today or in the future
  const visitDate = new Date(visitor.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateValid = visitDate >= today;
  
  return nameMatches && companyMatches && dateValid;
}
  async notifySecurity(visitorId: number): Promise<void> {
    const visitor = await this.visitorsRepository.findOne({ where: { id: visitorId } })

    if (!visitor) {
      throw new Error("Visitor not found")
    }

    // Send notification to security
    await this.notificationsService.sendSecurityNotification({
      visitorId: visitor.id,
      visitorName: visitor.name,
      company: visitor.company,
      date: visitor.date,
      time: visitor.time,
      contactPerson: visitor.contactPerson,
    })

    // Update visitor notification status
    await this.visitorsRepository.update(visitorId, { notificationSent: true })
  }
}
