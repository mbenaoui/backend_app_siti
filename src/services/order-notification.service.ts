import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Order } from '../models/order.model';
import { Partner } from '../models/partner.model';

@Injectable()
export class OrderNotificationService {
  private readonly whatsappApiUrl: string;
  private readonly whatsappApiKey: string;
  private readonly whatsappGroupId: string;

  constructor(private configService: ConfigService) {
    this.whatsappApiUrl = this.configService.get<string>('WHATSAPP_API_URL') || '';
    this.whatsappApiKey = this.configService.get<string>('WHATSAPP_API_KEY') || '';
    this.whatsappGroupId = this.configService.get<string>('WHATSAPP_GROUP_ID') || '';
  }

  async sendOrderNotification(order: Order, partner: Partner, method: 'whatsapp' | 'email' = 'whatsapp'): Promise<void> {
    try {
      if (method === 'whatsapp') {
        await this.sendWhatsAppNotification(order, partner);
      } else {
        await this.sendEmailNotification(order, partner);
      }
    } catch (error) {
      console.error('Error sending order notification:', error);
      throw new Error(`Failed to send ${method} notification: ${error.message}`);
    }
  }

  private async sendWhatsAppNotification(order: Order, partner: Partner): Promise<void> {
    if (!this.whatsappApiUrl || !this.whatsappApiKey || !this.whatsappGroupId) {
      throw new Error('WhatsApp configuration is missing');
    }

    try {
      const message = this.formatWhatsAppMessage(order, partner);
      
      const response = await axios.post(
        `${this.whatsappApiUrl}/messages`,
        {
          to: this.whatsappGroupId,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.whatsappApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`WhatsApp API returned status ${response.status}`);
      }

      console.log('WhatsApp notification sent successfully');
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      throw new Error(`Failed to send WhatsApp notification: ${error.message}`);
    }
  }

  private async sendEmailNotification(order: Order, partner: Partner): Promise<void> {
    // Implement email notification logic here
    throw new Error('Email notifications are not implemented yet');
  }

  private formatWhatsAppMessage(order: Order, partner: Partner): string {
    const items = order.items.map(item => 
      `- ${item.quantity}x ${item.product.name} (${item.unitPrice} MAD)`
    ).join('\n');

    return `🚨 Nouvelle commande reçue!\n\n` +
           `📦 Référence: ${order.reference}\n` +
           `🏢 Fournisseur: ${partner.name}\n` +
           `💰 Montant total: ${order.totalAmount} MAD\n\n` +
           `📋 Détails de la commande:\n${items}\n\n` +
           `📝 Justification: ${order.justification}\n\n` +
           `🕒 Date: ${new Date(order.createdAt).toLocaleString('fr-FR')}\n` +
           `👤 Créé par: ${order.createdBy.name}`;
  }
} 