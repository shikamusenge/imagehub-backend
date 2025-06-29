import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, Put, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any
  ) {
    const user = req.user;
    if (user.role !== 'ADMIN' && +user.id !== +id) {
      throw new BadRequestException('You are not authorized to update this user');
    }
    return this.usersService.update(+id, updateUserDto);
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  changePassword(
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
    @Request() req: any,
  ) {
    try {
      const user = req.user;
      let userId: number;
      console.log(user);
      if (user && user.role === 'ADMIN') {
        userId = +req.body.id;
      } else {
        userId = +user.id;
      }
        if (userId === undefined || userId === null || isNaN(userId) || !oldPassword || !newPassword) {
          throw new BadRequestException("user  id, oldPassword and newPassword are required");
        }
      return this.usersService.changePassword(userId, oldPassword, newPassword);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to change password');
    }
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
