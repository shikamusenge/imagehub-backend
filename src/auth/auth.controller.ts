import { Controller, Post, Body, UseGuards, Req, Get, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { username: string; password: string }) {
    // 1. Validate user exists
    const user = await this.authService.validateUser(
      loginDto.username, 
      loginDto.password
    );
    
    // 2. Throw error if invalid
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Return tokens if valid
    return this.authService.login(user);
  }

  @Post('refresh')
  @UseGuards(RefreshAuthGuard)
  async refresh(@Req() req:any) {
    return this.authService.refreshToken(req.user);
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getProtectedData() {
    return { message: 'This is protected data for admins only' };
  }
}