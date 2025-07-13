import { Controller, Post, Body, UseGuards, Req, Get, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login/login';
import { ApiOperation, ApiTags,ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiOperation({
    summary: 'User login',
    requestBody: {
      content: {
        'application/json': {
          example: {
            email: 'user@example.com',
            password: 'securepassword', 
          },
        },
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
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