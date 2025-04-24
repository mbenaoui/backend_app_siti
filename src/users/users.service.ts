import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { User } from "./entities/user.entity"

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } })
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } })
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData)
    return this.userRepository.save(user)
  }

  async update(id: number, userData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, userData)
    const updatedUser = await this.userRepository.findOne({ where: { id } })
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return updatedUser
  }

 
}
