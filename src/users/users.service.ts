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

  const { email, password, name, Role } = updateUserDto;

  // Only hash password if provided
  const hashedPassword = password
    ? await bcrypt.hash(password, 10)
    : undefined;

  return this.prisma.user.update({
    where: { id },
    data: {
      ...(email && { email }),
      ...(hashedPassword && { password: hashedPassword }),
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
}
