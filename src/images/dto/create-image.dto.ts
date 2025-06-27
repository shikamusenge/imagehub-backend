// dto/create-image.dto.ts
import { ImageVariant } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateImageDto {
  @IsInt()
  @Transform(({ value }) =>
  typeof value === 'string' ? parseInt(value) : isNaN(parseInt(value))? 0:value)
  eventId: number;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ImageVariant)
  variant: ImageVariant;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsInt()
  originalId?: number;
}
