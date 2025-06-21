// dto/create-image.dto.ts
import { ImageVariant } from '@prisma/client';
import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateImageDto {
  @IsInt()
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
