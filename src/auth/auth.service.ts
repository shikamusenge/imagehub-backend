import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateUser(email: string, pass: string): Promise<any> {
    try {
      const user = await prisma.user.findFirst({ where: { email } });
      console.log(user);
  
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }
  
      const isPasswordValid = await bcrypt.compare(pass, user.password);
  
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }
  
      const { password, ...sanitizedUser } = user;
      return sanitizedUser;
    } catch (error) {
      console.error('Error in validateUser:', error);
      // If the error is already an UnauthorizedException, rethrow it
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Login failed');
    }
  }
  
  
  async login(user: any) {
    try {
      const payload = {
        email: user.email,
        sub: user.id,
        roles: user.roles,
      };
  
      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'MY SECRET',
        expiresIn: '1h',
      });
  
      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'MY SECRET',
        expiresIn: '7d',
      });
  
      return {
        status: 'success',
        message: 'Login successful',
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          user: {
            id: user.id,
            email: user.email,
            roles: user.roles,
          },
        },
      };
    } catch (error) {
      console.error('Error in login:', error);
      throw new InternalServerErrorException('Login failed');
    }
  }

  async refreshToken(user: any) {
    return this.login(user);
  }
}
