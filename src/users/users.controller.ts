import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { IUser } from 'src/types/user.type';

@Controller('users') // Base route: /users
export class UsersController {
  constructor(private readonly usersService: UsersService) {} 
  
  @Get()
  getAllUsers(): IUser[] {
    return this.usersService.getAllUsers();
  }
}