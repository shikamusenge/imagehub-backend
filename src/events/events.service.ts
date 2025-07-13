// src/events/events.service.ts
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaClient, ImageVariant, Prisma, EventType } from '@prisma/client';
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

      const watermarkHeight = Math.floor(imgHeight * 0.15);

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
            folder: `events/temp/originals`,
          }),
          this.cloudinary.uploadBuffer(watermarkedBuffer, {
            folder: `events/temp/watermarks`,
          }),
        ]);
      } catch (err) {
        // Log and throw a more descriptive error
        console.error('Cloudinary upload failed:', err);
        throw new InternalServerErrorException('Image upload failed. Please try again later.');
      }

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
    eventType?: string;
  } = {}
): Promise<EventWithRelations[]> {
  const {
    skip = 0,
    take = 10,
    includeOriginals = true,
    includeWatermarks = false,
    upcomingOnly = false,
    eventType = undefined,
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

  // Build the event filter
  const eventWhere: Prisma.EventWhereInput = {};
  if (upcomingOnly) {
    eventWhere.date = { gte: new Date() };
  }
  if (eventType) {
    eventWhere.eventType = eventType as EventType;
  }

  const events = await prisma.event.findMany({
    skip,
    take,
    where: eventWhere,
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
    eventType: event.eventType,
    description: event.description ?? null,
    date: event.date,
    location: event.location,
    user: event.user,
    images: event.images,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    _count: event._count,
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
