// images.module.ts
import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { PrismaService } from '../prisma/prisma.service';
import { ImagesController } from './images.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  controllers: [ImagesController],
  providers: [ImagesService, PrismaService, CloudinaryService],
})
export class ImagesModule {}
