import { ApiProperty } from '@nestjs/swagger';
import { ImageVariant } from '@prisma/client';

export class EventImageDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  url: string;

  @ApiProperty({ enum: ImageVariant })
  variant: ImageVariant;

  @ApiProperty()
  order: number;

  @ApiProperty({ required: false, nullable: true })
  originalId?: number | null;

  @ApiProperty({ required: false, nullable: true, example: 'View from main stage' })
  description?: string | null;

  @ApiProperty()
  createdAt: Date;
}
