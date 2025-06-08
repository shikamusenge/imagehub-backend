import { IsEmail, IsString,IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty()
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;
  
    @ApiProperty()
    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    password: string;
}
