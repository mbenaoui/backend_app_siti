import { Injectable, Logger } from "@nestjs/common"
import  { ConfigService } from "@nestjs/config"
import  { Order } from "./entities/order.entity"
import  { UsersService } from "../users/users.service"
import axios from "axios"
import * as nodemailer from "nodemailer"

@Injectable()
export class OrderNotificationService {
  private readonly logger = new Logger(OrderNotificationService.name)
  private readonly emailTransporter
  private readonly fromEmail: string

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
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

    this.fromEmail = this.configService.get<string>("FROM_EMAIL") || "notifications@siti.ma"
  }

  async notify(order: Order): Promise<boolean> {
    try {
      this.logger.log(`Sending notifications for order ${order.id} with ${order.items?.length || 0} items`)

      // Send both notifications in parallel
      const [whatsappResult, emailResult] = await Promise.all([
        this.sendWhatsAppNotification(order),
        this.sendEmailNotification(order),
      ])

      // Log the results
      if (whatsappResult) {
        this.logger.log(`WhatsApp notification sent successfully for order ${order.id}`)
      } else {
        this.logger.warn(`WhatsApp notification failed for order ${order.id}`)
      }

      if (emailResult) {
        this.logger.log(`Email notification sent successfully for order ${order.id}`)
      } else {
        this.logger.warn(`Email notification failed for order ${order.id}`)
      }

      // Return true only if both notifications were successful
      return whatsappResult && emailResult
    } catch (error) {
      this.logger.error(`Failed to send notifications: ${error.message}`)
      return false
    }
  }

  async sendWhatsAppNotification(order: Order): Promise<boolean> {
    try {
      // Get user information if userId is available
      let username = "Unknown User"
      if (order.userId) {
        try {
          const user = await this.usersService.findById(order.userId)
          if (user) {
            username = user.firstName || user.email || "Unknown User"
          }
        } catch (error) {
          this.logger.warn(`Could not fetch user info: ${error.message}`)
        }
      }

      // Format the message
      const message = this.formatWhatsAppMessage(order, username)

      // Get the WhatsApp group ID for this supplier
      const groupId = this.getWhatsAppGroupForSupplier(order.supplier)

      // Check if Meta WhatsApp API is configured
      const token = this.configService.get<string>("META_WHATSAPP_TOKEN")
      const phoneNumberId = this.configService.get<string>("META_WHATSAPP_PHONE_NUMBER_ID")

      if (token && phoneNumberId) {
        console.log(groupId);
        // Use Meta WhatsApp Business API to message the group
        return await this.sendViaMetaWhatsAppAPI(groupId, message, token, phoneNumberId)
      } else {
        // Fallback to generating a WhatsApp URL
        const whatsappUrl = `https://wa.me/${groupId}?text=${encodeURIComponent(message)}`
        this.logger.log(`WhatsApp message URL generated (Meta API not configured):`)
        this.logger.log(whatsappUrl)

        // Return the URL for manual sending or frontend use
        return true
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp notification: ${error.message}`)
      return false
    }
  }

  private getWhatsAppGroupForSupplier(supplierName: string): string {
    // This mapping should ideally be stored in a database
    // Each supplier would have an associated WhatsApp group ID or admin number
    const supplierGroups = {
      
      "Supplier A": "+212638910098", // This would be the actual group admin number
      "Supplier B": "+212638910098",
      "Supplier C": "+212638910098",
      Canon: "+212638910098",
      // Add more suppliers as needed
    }

    // Return the group ID or a default group
    return supplierGroups[supplierName] || "+212638910098" // Default group if not found
  }

  // private async sendViaMetaWhatsAppAPI(
  //   recipientId: string,
  //   message: string,
  //   token: string,
  //   phoneNumberId: string,
  // ): Promise<boolean> {
  //   try {
  //     // Ensure recipient ID is in the correct format (no + sign, just numbers)
  //     const formattedRecipient = recipientId.replace(/\D/g, "")

  //     // Prepare the request body
  //     const requestBody = {
  //       messaging_product: "whatsapp",
  //       to: formattedRecipient,
  //       type: "text",
  //       text: {
  //         body: message,
  //       },
  //     }
  //     console.log("requestBody :", requestBody);
  //     // Send the request to Meta WhatsApp API
  //     const response = await axios.post(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, requestBody, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //     })

  //     this.logger.log(`Meta WhatsApp API response: ${JSON.stringify(response.data)}`)
  //     return true
  //   } catch (error) {
  //     this.logger.error(`Meta WhatsApp API error: ${error.response?.data || error.message}`)
  //     return false
  //   }
  // }
  private async sendViaMetaWhatsAppAPI(
    recipientId: string,
    message: string,
    token: string,
    phoneNumberId: string,
  ): Promise<boolean> {
    try {
      // Ensure recipient ID is in the correct format (no + sign, just numbers)
      const formattedRecipient = recipientId.replace(/\D/g, "")
      
      // Log what we're about to send
      this.logger.log(`Sending WhatsApp message to ${formattedRecipient} via Meta API`)
      
      // For business-initiated messages, we must use a template
      const requestBody = {
        messaging_product: "whatsapp",
        to: formattedRecipient,
        type: "template",
        template: {
          name: "hello_world",
          language: {
            code: "en_US"  // This template is in English
          }
        }
      }
      
      // For debugging
      this.logger.log(`Request body: ${JSON.stringify(requestBody)}`)
      
      // Send the request to Meta WhatsApp API
      const response = await axios.post(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, 
        requestBody, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      
      this.logger.log(`Meta WhatsApp API response: ${JSON.stringify(response.data)}`)
      return true
    } catch (error) {
      // Improved error logging
      this.logger.error(`Meta WhatsApp API error: ${JSON.stringify(error.response?.data || error.message)}`)
      
      // Log more details if available
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`)
      }
      
      return false
    }
  }

  async sendEmailNotification(order: Order): Promise<boolean> {
    try {
      // We want to send email to the employee who placed the order
      if (!order.userId) {
        this.logger.warn(`No user ID associated with order ${order.id}, cannot send email notification`)
        return false
      }

      // Get user information
      const user = await this.usersService.findById(order.userId)
      if (!user || !user.email) {
        this.logger.warn(`User ${order.userId} has no email address, cannot send notification`)
        return false
      }

      const username = user.firstName || user.email
      const userEmail = user.email

      // Make sure order.items is an array
      const items = Array.isArray(order.items) ? order.items : []
      this.logger.log(`Formatting email with ${items.length} items`)

      // Format items list for email - FIXED: Ensure all items are included
      const itemsList = items
        .map((item) => `<li>${item.productName} (${item.quantity} x ${item.unitPrice} MAD)</li>`)
        .join("")

      // Get justification from the first item (if available)
      const justification = items.length > 0 ? items[0].justification : ""

      // Send email to the employee
      const emailResult = await this.emailTransporter.sendMail({
        from: this.fromEmail,
        to: userEmail,
        subject: `Confirmation de commande - ${order.reference}`,
        html: `
          <h2>Confirmation de votre commande</h2>
          <p>Bonjour ${username},</p>
          <p>Votre commande a été enregistrée avec succès et une notification a été envoyée au fournisseur.</p>
          
          <p><strong>Référence:</strong> ${order.reference}</p>
          <p><strong>Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
          <p><strong>Fournisseur:</strong> ${order.supplier}</p>
          
          <h3>Produits Commandés:</h3>
          <ul>
            ${itemsList}
          </ul>
          
          <p><strong>Total:</strong> ${order.totalAmount} MAD</p>
          
          <p><strong>Justification:</strong> ${justification || "Non fournie"}</p>
          
          <p>Vous serez informé(e) lorsque votre commande sera livrée.</p>
          <p>Cordialement,<br>L'équipe SITI</p>
        `,
      })

      this.logger.log(`Confirmation email sent to ${userEmail}, messageId: ${emailResult.messageId}`)
      return true
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`)
      return false
    }
  }

  formatWhatsAppMessage(order: Order, username: string): string {
    // Make sure order.items is an array
    const items = Array.isArray(order.items) ? order.items : []
    this.logger.log(`Formatting WhatsApp message with ${items.length} items`)

    // Format items list - FIXED: Ensure all items are included
    const itemsList = items.map((item) => `- ${item.productName} (${item.quantity} x ${item.unitPrice} MAD)`).join("\n")

    // Get justification from the first item (if available)
    const justification = items.length > 0 ? items[0].justification : ""

    // Format the complete message
    return `*Nouvelle Commande SITI - ${username}*

*Référence:* ${order.reference}
*Date:* ${new Date(order.orderDate).toLocaleDateString()}
*Fournisseur:* ${order.supplier}

*Produits Commandés:*
${itemsList}

*Total:* ${order.totalAmount} MAD

*Justification:* ${justification || "Non fournie"}

Veuillez confirmer la livraison.`
  }

  // Helper method to get a WhatsApp link for manual sending
  getWhatsAppLinkForOrder(order: Order): Promise<string> {
    return new Promise(async (resolve) => {
      try {
        // Get user information if userId is available
        let username = "Unknown User"
        if (order.userId) {
          try {
            const user = await this.usersService.findById(order.userId)
            if (user) {
              username = user.firstName || user.email || "Unknown User"
            }
          } catch (error) {
            this.logger.warn(`Could not fetch user info: ${error.message}`)
          }
        }

        // Format the message
        const message = this.formatWhatsAppMessage(order, username)

        // Get the WhatsApp group ID for this supplier
        const groupId = this.getWhatsAppGroupForSupplier(order.supplier)

        // Generate the WhatsApp URL
        const whatsappUrl = `https://wa.me/${groupId}?text=${encodeURIComponent(message)}`
        resolve(whatsappUrl)
      } catch (error) {
        this.logger.error(`Failed to generate WhatsApp link: ${error.message}`)
        resolve(`https://wa.me/?text=${encodeURIComponent("Error generating message")}`)
      }
    })
  }
}
