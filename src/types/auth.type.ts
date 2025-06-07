export type AuthType={auth:boolean, token?: string; expiresIn: number,message?:""}

export interface IJwtPayload {
    sub: string;
    username: string;
    roles: string[];
  }