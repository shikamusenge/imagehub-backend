import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express'; // ✅ Add this
import { IJwtPayload } from 'src/types/auth.type';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_REFRESH_SECRET || "My SECRET",
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: IJwtPayload) {
    const authHeader = req.headers['authorization'];
    const refreshToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    return {
      ...payload,
      refreshToken,
    };
  }
}
