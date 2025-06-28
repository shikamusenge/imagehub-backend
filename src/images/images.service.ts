import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import * as sharp from 'sharp';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService, // ✅ Injected properly
  ) {}

  async create(createImageDto: CreateImageDto, file: Express.Multer.File) {
    let { eventId, description } = createImageDto;

    if (!file) {
      throw new InternalServerErrorException('Image file is required');
    }
    eventId = typeof eventId === 'string' ? parseInt(eventId, 10) : eventId;
    const event = await this.prisma.event.findUnique({
      where: { id: Number(eventId) },
    });
    if (!event) {
      throw new NotFoundException(`Event #${eventId} not found`);
    }

    const metadata = await sharp(file.buffer).metadata();
    const imgWidth = metadata.width || 800;
    const imgHeight = metadata.height || 600;
    const watermarkHeight = Math.floor(imgHeight * 0.15);

    // Create SVG watermark with gradient and shadow
const watermarkSvg = Buffer.from(`
  <svg width="${imgWidth}" height="${watermarkHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#007cf0;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#00dfd8;stop-opacity:1" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>
    <rect x="0" y="0" width="${imgWidth}" height="${watermarkHeight}" rx="14" ry="14" fill="url(#grad)" />
    <text x="50%" y="55%"
          dominant-baseline="middle" text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="${Math.floor(watermarkHeight * 0.4)}" font-weight="bold"
          fill="#fff" stroke="#222" stroke-width="2"
          filter="url(#shadow)">
      © IKOMBE Creative ${new Date().getFullYear()}
    </text>
  </svg>
`);

    const [originalBuffer, watermarkedBuffer] = await Promise.all([
      sharp(file.buffer).jpeg({ quality: 90 }).toBuffer(),
      sharp(file.buffer)
        .composite([
          {
            input: await sharp(watermarkSvg).toBuffer(),
            gravity: 'center',
            blend: 'overlay',
          },
        ])
        .jpeg({ quality: 85 })
        .toBuffer(),
    ]);

    let originalUpload, watermarkedUpload;

    try {
      [originalUpload, watermarkedUpload] = await Promise.all([
        this.cloudinary.uploadBuffer(originalBuffer, {
          folder: `events/${eventId}/originals`,
        }),
        this.cloudinary.uploadBuffer(watermarkedBuffer, {
          folder: `events/${eventId}/watermarks`,
        }),
      ]);
    } catch (error) {
      throw new InternalServerErrorException('Cloudinary upload failed');
    }

    return this.prisma.$transaction(async (prisma) => {
      const originalImage = await prisma.eventImage.create({
        data: {
          eventId,
          url: originalUpload.secure_url,
          variant: 'ORIGINAL',
          description,
          order: 0,
        },
      });

      const watermarkedImage = await prisma.eventImage.create({
        data: {
          eventId,
          url: watermarkedUpload.secure_url,
          variant: 'WATERMARK',
          description,
          order: 0,
          originalId: originalImage.id,
        },
      });

      return {
        message: 'Image uploaded successfully',
        original: originalImage,
        watermarked: watermarkedImage,
      };
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

    // If this is a WATERMARK variant and has an originalId, update the original as well
    if (existing.variant === 'WATERMARK' && existing.originalId) {
      await this.prisma.eventImage.update({
        where: { id: existing.originalId },
        data: updateImageDto,
      });
    }

    return this.prisma.eventImage.update({
      where: { id },
      data: updateImageDto,
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.eventImage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Image #${id} not found`);

        // If this is a WATERMARK variant and has an originalId, update the original as well
    if (existing.variant === 'WATERMARK' && existing.originalId) {
      await this.prisma.eventImage.delete({
        where: { id: existing.originalId }
      });
    }
    return this.prisma.eventImage.delete({ where: { id } });
  }
}
