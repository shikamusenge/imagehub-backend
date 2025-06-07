import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  private users = [
    {
      id: 1,
      username: 'admin',
      password: bcrypt.hashSync('securepassword', 10), // Hashed password
      roles: ['admin']
    }
  ];

  async validateUser(username: string, pass: string): Promise<any> {
    const user = this.users.find(u => u.username === username);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      username: user.username, 
      sub: user.id,
      roles: user.roles
    };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || "MY SECRET",
        expiresIn: '1h'
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || "MY SECRET",
        expiresIn: '7d'
      })
    };
  }

  async refreshToken(user: any) {
    return this.login(user);
  }
}