import { Injectable } from '@nestjs/common';
import { AuthType } from './types/auth.type';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  auth():AuthType{
    return {
      auth:true,
      token:"",
      message:"",
      expiresIn:3000
    }
  }
}
