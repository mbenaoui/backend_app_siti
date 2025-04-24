import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import  { Like, Repository } from "typeorm"
import  { CreateVisitorDto } from "./visitor.dto"
import { Visitor } from "./entities/visitor.entity"
import { BadgeService } from "../badge/badge.service";


@Injectable()
export class VisitorService {
  private visitors: CreateVisitorDto[] = [];

  constructor(
    @InjectRepository(Visitor)
    private visitorRepository: Repository<Visitor>,
    private readonly badgeService: BadgeService, 
  ) {}
  async getVisitors(
    search: string,
    sortBy: string = 'date',
    order: 'asc' | 'desc' = 'desc'
  ) {
    const where: any = {};
    
    if (search) {
      where.name = Like(`%${search}%`);
      // Add other searchable fields
    }

    return this.visitorRepository.find({
      where,
      order: { [sortBy]: order.toUpperCase() },
    });
  }
// backend/src/visitors/visitor.service.ts
// Add this method to your existing VisitorService class

async validateBadge(badgeCode: string): Promise<any> {
  try {
    console.log(`Validating badge with code: ${badgeCode}`);
    
    // Extract visitor name from badge code
    let visitorName: string = '';
    
    // Check if it's in the format "VISITOR:NAME" or "VISITOR:ANYTHING:NAME"
    if (badgeCode.startsWith('VISITOR:')) {
      const parts = badgeCode.split(':');
      if (parts.length >= 2) {
        // Use the last part as the name
        visitorName = parts[parts.length - 1];
      } else {
        throw new BadRequestException('Format de code QR invalide: format incorrect');
      }
    } else {
      // Try to parse as JSON
      try {
        const badgeData = JSON.parse(badgeCode);
        if (badgeData.name) {
          visitorName = badgeData.name;
        } else {
          throw new Error('No visitor name found');
        }
      } catch (e) {
        console.error(`Invalid badge code format: ${e.message}`);
        throw new BadRequestException('Format de code QR invalide');
      }
    }
    
    if (!visitorName) {
      console.error('Badge code does not contain visitor name');
      throw new BadRequestException('Code QR invalide: nom de visiteur manquant');
    }
    
    // Find the visitor by name
    const allVisitors = await this.findAll();
    const visitor = allVisitors.find(v => 
      v.name.toLowerCase() === visitorName.toLowerCase() ||
      v.name.toLowerCase().includes(visitorName.toLowerCase()) ||
      visitorName.toLowerCase().includes(v.name.toLowerCase())
    );
    
    if (!visitor) {
      console.error(`Visitor with name ${visitorName} not found`);
      throw new NotFoundException('Visiteur non trouvé');
    }
    
    // Check if the badge is valid
    const isValid = this.isBadgeValid(visitor, { name: visitorName });
    
    // Return visitor data with validation result
    return {
      isValid,
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
    console.error(`Error validating badge: ${error.message}`);
    throw error;
  }
}
private isBadgeValid(visitor: any, badgeData: any): boolean {
  // For string format badges, we might only have ID and name
  // So we'll make the validation more flexible
  
  // If name is provided in badge data, check if it matches (partial match is fine)
  let nameValid = true;
  if (badgeData.name && visitor.name) {
    nameValid = visitor.name.toLowerCase().includes(badgeData.name.toLowerCase()) || 
                badgeData.name.toLowerCase().includes(visitor.name.toLowerCase());
  }
  
  // If company is provided in badge data, check if it matches
  let companyValid = true;
  if (badgeData.company && visitor.company) {
    companyValid = visitor.company === badgeData.company;
  }
  
  // Check if the visit date is today or in the future (if date is available)
  let dateValid = true;
  if (visitor.date) {
    const visitDate = new Date(visitor.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateValid = visitDate >= today;
  }
  
  // For basic validation, we'll just check if the visitor exists and the name matches
  return nameValid && dateValid;
}


  async create(createVisitorDto: CreateVisitorDto) {
    // For backward compatibility with existing code
    this.visitors.push(createVisitorDto)

    // Create and save visitor in database
    const visitor = this.visitorRepository.create(createVisitorDto)
    await this.visitorRepository.save(visitor)

    return { message: "Visitor added", visitor }
  }

  async findAll() {
    // Try to get from database first
    try {
      return await this.visitorRepository.find()
    } catch (error) {
      // Fallback to in-memory array if database is not yet set up
      return this.visitors
    }
  }

  async findOne(id: number) {
    try {
      return await this.visitorRepository.findOne({ where: { id } })
    } catch (error) {
      return this.visitors.find((v, index) => index === id)
    }
  }

  async update(id: number, updateData: Partial<Visitor>) {
    try {
      await this.visitorRepository.update(id, updateData)
      return this.findOne(id)
    } catch (error) {
      // Fallback for in-memory array
      const index = this.visitors.findIndex((v, idx) => idx === id)
      if (index >= 0) {
        this.visitors[index] = { ...this.visitors[index], ...updateData }
        return this.visitors[index]
      }
      return null
    }
  }

  // async generateBadge(id: number) {
  //   // This would be implemented with the BadgeService in a real app
  //   // For now, return a mock URL
  //   const visitor = await this.findOne(id)
  //   if (!visitor) {
  //     throw new Error("Visitor not found")
  //   }

  //   const badgeUrl = `http://10.0.2.2:3000/badges/visitor_${id}_badge.pdf`
  //   await this.update(id, { badgeUrl })

  //   return badgeUrl
  // }
  async generateBadge(id: number) {
    return this.badgeService.generateBadge(id);
  }

  // async notifySecurity(id: number) {
  //   // This would be implemented with the NotificationsService in a real app
  //   const visitor = await this.findOne(id)
  //   if (!visitor) {
  //     throw new Error("Visitor not found")
    
  //   }
    

  //   await this.update(id, { notificationSent: true })
  //   return true
  // }
  async notifySecurity(id: number) {
    await this.badgeService.notifySecurity(id);
    return true;
  }
}
