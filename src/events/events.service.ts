// src/events/events.service.ts
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaClient, ImageVariant, Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as sharp from 'sharp';
import { Blend } from 'sharp';
import { EventWithRelations } from './dto/event-response.dto';

const prisma = new PrismaClient();

@Injectable()
export class EventsService {
  constructor(private readonly cloudinary: CloudinaryService) {}

async create(createEventDto: CreateEventDto, files: Express.Multer.File[]) {
  const { title, description, date, location, userId, imageDescriptions } = createEventDto;

  if (!files?.length) {
    throw new InternalServerErrorException('At least one image file is required');
  }

  // 1. Process images + upload outside transaction
  const processedUploads = await Promise.all(files.map(async (file, index) => {
    const metadata = await sharp(file.buffer).metadata();
    const imgWidth = metadata.width || 800;
    const imgHeight = metadata.height || 600;

    const watermarkWidth = Math.floor(imgWidth * 0.5);
    const watermarkHeight = Math.floor(imgHeight * 0.15);
    const fontSize = Math.floor(watermarkHeight * 0.4);

    const watermarkSvg = Buffer.from(`
      <svg width="${watermarkWidth}" height="${watermarkHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="blur" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
          </filter>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" rx="12" ry="12"
              fill="#00000080" filter="url(#blur)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}"
              fill="#ffffff" fill-opacity="0.95" stroke="#222222" stroke-width="1">
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

    const [originalUpload, watermarkedUpload] = await Promise.all([
      this.cloudinary.uploadBuffer(originalBuffer, {
        folder: `events/temp/originals`,
      }),
      this.cloudinary.uploadBuffer(watermarkedBuffer, {
        folder: `events/temp/watermarks`,
      }),
    ]);

    return {
      index,
      originalUrl: originalUpload.secure_url,
      watermarkedUrl: watermarkedUpload.secure_url,
      description: imageDescriptions?.[index] || null,
    };
  }));

  // 2. Now create event + images DB records inside transaction (fast DB ops only)
  return prisma.$transaction(async (prisma) => {
    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        user: { connect: { id: Number(userId) } },
      },
    });

    for (const item of processedUploads) {
      const originalImage = await prisma.eventImage.create({
        data: {
          url: item.originalUrl,
          variant: 'ORIGINAL',
          order: item.index,
          description: item.description,
          event: { connect: { id: event.id } },
        },
      });

      await prisma.eventImage.create({
        data: {
          url: item.watermarkedUrl,
          variant: 'WATERMARK',
          order: item.index,
          description: item.description,
          original: { connect: { id: originalImage.id } },
          event: { connect: { id: event.id } },
        },
      });
    }

    return { message: 'Event created successfully', eventId: event.id };
  });
}


async findAll(
  options: {
    skip?: number;
    take?: number;
    includeOriginals?: boolean;
    includeWatermarks?: boolean;
    upcomingOnly?: boolean;
  } = {}
): Promise<EventWithRelations[]> {
  const {
    skip = 0,
    take = 10,
    includeOriginals = true,
    includeWatermarks = false,
    upcomingOnly = false
  } = options;

  // Build the image filter
  const imageFilter: Prisma.EventImageWhereInput = {};
  if (!includeOriginals && !includeWatermarks) {
    // If both are false, return empty array (or could throw error)
    return [];
  } else if (!includeOriginals) {
    imageFilter.variant = 'WATERMARK';
  } else if (!includeWatermarks) {
    imageFilter.variant = 'ORIGINAL';
  }
  // else - include both (no filter)

  const events = await prisma.event.findMany({
    skip,
    take,
    where: upcomingOnly ? { date: { gte: new Date() } } : {},
    include: {
      images: {
        where: imageFilter,
        orderBy: { order: 'asc' },
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          images: true,
        },
      },
    },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return events.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description ?? null,
    date: event.date,
    location: event.location,
    user: event.user,
    images: event.images,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    _count: event._count
  }));
}

  async findOne(id: number) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: number, updateEventDto: Prisma.EventUpdateInput) {
    try {
      return await prisma.event.update({
        where: { id },
        data: updateEventDto,
        include: {
          images: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Event with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

async remove(id: number) {
  try {
    // First delete associated images
    await prisma.eventImage.deleteMany({
      where: { eventId: id }  // Corrected condition
    });

    return await prisma.event.delete({
      where: { id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }
    }
    throw error;
  }
}

  // Optional: Add pagination version of findAll
  async findPaginated(skip: number, take: number) {
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        skip,
        take,
        include: {
          images: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      }),
      prisma.event.count(),
    ]);

    return {
      data: events,
      meta: {
        total,
        currentPage: Math.floor(skip / take) + 1,
        perPage: take,
        lastPage: Math.ceil(total / take),
      },
    };
  }
}
