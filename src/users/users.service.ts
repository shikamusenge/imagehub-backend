import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private prisma = new PrismaClient();

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, name, Role } = createUserDto;

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        Role: Role, 
      },
    });

    return newUser;
  }
  
  async findAll(): Promise<User[]> {
    return await this.prisma.user.findMany();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

 async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
  const existingUser = await this.prisma.user.findUnique({ where: { id } });

  if (!existingUser) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }

  const { email, name, Role } = updateUserDto;

  return this.prisma.user.update({
    where: { id },
    data: {
      ...(email && { email }),
      ...(name && { name }),
      ...(Role && { Role: Role }), // Ensure Prisma uses `role`, not `Role`
    },
  });
}


  async remove(id: number): Promise<User> {
    // Check if user exists before deleting
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return await this.prisma.user.delete({
      where: { id },
    });
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<User> {
    try {
      console.log({ userId, oldPassword, newPassword });
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
      throw new ConflictException('Old password is incorrect');
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      return await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
      });
    } catch (error) {
      return error.response || error.message || error;
    }
  }
}
