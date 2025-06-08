export interface IUser {
  id?: string;           // Unique user ID (UUID or string)
  email?: string;        // User email
  name?: string;        // Optional user name
  passwordHash?: string; // Hashed password
  username?:string;
  password?:string;
  role?: 'ADMIN' | 'USER' | 'GUEST'; // Role as enum string
  createdAt: Date;      // Creation timestamp
  updatedAt?: Date;      // Last update timestamp
}