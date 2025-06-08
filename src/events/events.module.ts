// events.module.ts
import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PrismaModule } from '../prisma/prisma.module'; // If you're using Prisma

@Module({
  imports: [CloudinaryModule, PrismaModule], // Add all required modules
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}