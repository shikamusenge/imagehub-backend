// dto/upload-image.dto.ts
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadImageDto {
  @IsInt()
  @Type(() => Number)
  eventId: number;

  @IsOptional()
  @IsString()
  description?: string;
}
