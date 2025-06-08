// event-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';
import { EventImageDto } from './event-image.dto';

export class EventWithRelations {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  location: string;

  @ApiProperty({ type: () => UserDto })
  user: UserDto;

  @ApiProperty({ type: () => [EventImageDto] })
  images: EventImageDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  _count?: {
    images: number;
  };
}