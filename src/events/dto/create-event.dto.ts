import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsDateString,
    IsInt,
    IsNumber,
  } from 'class-validator';
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { integer } from 'aws-sdk/clients/cloudfront';
import { Type } from 'class-transformer';
  
  export class CreateEventDto {
    @ApiProperty({ example: 'Summer Art Fair' })
    @IsString()
    @IsNotEmpty({ message: 'Title is required' })
    title: string;
  
    @ApiPropertyOptional({ example: 'An open-air exhibition of local artists' })
    @IsString()
    @IsOptional()
    description?: string;
  
    @ApiProperty({ example: '2025-07-15T10:00:00.000Z' })
    @IsDateString({}, { message: 'Date must be an ISO8601 string' })
    date: string;
  
    @ApiProperty({ example: 'Central Park, NYC' })
    @IsString()
    @IsNotEmpty({ message: 'Location is required' })
    location: string;
  
    @ApiProperty({ example: 42, description: 'ID of the user who creates the event' })
    @IsNumber()
    @Type(() => Number)
    userId: number;
  }
  