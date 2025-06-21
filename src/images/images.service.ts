// images.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';

@Injectable()
export class ImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createImageDto: CreateImageDto) {
    return this.prisma.eventImage.create({
      data: createImageDto,
    });
  }

  async findAll() {
    return this.prisma.eventImage.findMany();
  }

  async findOne(id: number) {
    const image = await this.prisma.eventImage.findUnique({ where: { id } });
    if (!image) throw new NotFoundException(`Image #${id} not found`);
    return image;
  }

  async update(id: number, updateImageDto: UpdateImageDto) {
    const existing = await this.prisma.eventImage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Image #${id} not found`);

    return this.prisma.eventImage.update({
      where: { id },
      data: updateImageDto,
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.eventImage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Image #${id} not found`);

    return this.prisma.eventImage.delete({ where: { id } });
  }
}
