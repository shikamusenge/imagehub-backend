import { Injectable } from '@nestjs/common';
import { IUser } from 'src/types/user.type';

@Injectable()
export class UsersService {
    private users: IUser[] = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user',
          products: ['product1', 'product2']
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'admin',
          products: ['product3']
        },
      ];
    
      getAllUsers(): IUser[] {
        return this.users;
      }
    
      getUserById(id: number) {
        return this.users.find(user => user.id === id);
      }
    
      createUser(userData: { name: string }) {
        const newUser = { id: this.users.length + 1, ...userData };
        this.users.push(newUser);
        return newUser;
      }
}
