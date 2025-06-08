// src/events/events.service.ts
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaClient, ImageVariant, Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as sharp from 'sharp';
import { Blend } from 'sharp';

const prisma = new PrismaClient();

@Injectable()
export class EventsService {
  constructor(private readonly cloudinary: CloudinaryService) {}
  

//   async create(createEventDto: CreateEventDto, files: Express.Multer.File[]) {
//     const { title, description, date, location, userId } = createEventDto;

//  // Watermark configuration
//  const watermarkConfig = {
//   text: `© M iMage Store ${new Date().getFullYear()} ${title}`,
//   width: 400,          // Wider for centered text
//   height: 80,          // Taller for better visibility
//   font: 'Arial',
//   fontSize: 36,
//   color: 'white',
//   opacity: 0.7,
//   backgroundColor: '#00000080'
// };

//     // Process files in parallel with better error handling
//     const uploads = await Promise.all(files.map(async (file, index) => {
//       try {
//         // 1. Process original image
//         const originalBuffer = await sharp(file.buffer)
//           .toFormat('jpeg')
//           .jpeg({ quality: 90 })
//           .toBuffer();

//         // 2. Get image metadata for watermark positioning
//         const metadata = await sharp(originalBuffer).metadata();
//         if (!metadata.width || !metadata.height) {
//           throw new Error('Could not read image dimensions');
//         }

//          // 2. Create watermark SVG
//          const svgWatermark = Buffer.from(`
//           <svg width="${watermarkConfig.width}" height="${watermarkConfig.height}">
//             <rect width="100%" height="100%" 
//                   fill="${watermarkConfig.backgroundColor}" 
//                   rx="10" ry="10"/> <!-- Rounded corners -->
//             <text x="50%" y="50%"
//                   font-family="${watermarkConfig.font}"
//                   font-size="${watermarkConfig.fontSize}"
//                   fill="${watermarkConfig.color}"
//                   fill-opacity="${watermarkConfig.opacity}"
//                   text-anchor="middle"
//                   dominant-baseline="middle">
//               ${watermarkConfig.text}
//             </text>
//           </svg>
//         `);

//       // 3. Create watermarked version
//       const watermarkedBuffer = await sharp(originalBuffer)
//         .composite([{
//           input: svgWatermark,
//           gravity: 'center',
//           top: 10,
//           left: 10
//         }])
//         .toFormat('jpeg')
//         .jpeg({ quality: 80 })
//         .toBuffer();

//       // Upload both versions
//       const [origResult, wmResult] = await Promise.all([
//         this.cloudinary.uploadBuffer(originalBuffer, { folder: 'events/original' }),
//         this.cloudinary.uploadBuffer(watermarkedBuffer, { folder: 'events/watermark' }),
//       ]);

//       return [
//         { url: origResult.secure_url, variant: ImageVariant.ORIGINAL, order: index },
//         { url: wmResult.secure_url, variant: ImageVariant.WATERMARK, order: index },
//       ];

//       } catch (error) {
//         console.log(error);
        
//         throw new InternalServerErrorException(`Image ${index + 1} processing failed`);
//       }
//     }));

//     // Save to database
//     try {
//       const imagesData = uploads.flat();
//       return await prisma.event.create({
//         data: {
//           title,
//           description,
//           date,
//           location,
//           user: { connect: { id: Number(userId)} },
//           images: { create: imagesData },
//         },
//         include: { images: true },
//       });
//     } catch (error) {
//       console.log(error);
      
//       // Optional: Add cleanup for uploaded Cloudinary images
//       throw new InternalServerErrorException('Failed to create event');
//     }
//   }


async create(
  createEventDto: CreateEventDto,
  files: Express.Multer.File[],
) {
  const { title, description, date, location, userId } = createEventDto;

  if (!files?.length) {
    throw new InternalServerErrorException('At least one image file is required');
  }

  // Increase transaction timeout to 30 seconds
  return prisma.$transaction(async (prisma) => {
    // 1. Create event record first
    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        user: { connect: { id: Number(userId) } },
      },
    });

    // 2. Process images sequentially to avoid transaction timeout
    for (const [index, file] of files.entries()) {
      try {
        // Process original image (non-blocking)
        const originalProcess = sharp(file.buffer)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toBuffer();

        // Create watermark SVG (non-blocking)
        const watermarkSvg = Buffer.from(`
          <svg width="600" height="100" viewBox="0 0 600 100">
            <rect width="100%" height="100%" rx="10" ry="10" fill="#00000080" />
            <text x="50%" y="50%" 
                  font-family="Arial" font-size="40" 
                  fill="white" fill-opacity="0.9"
                  stroke="#000000" stroke-width="2"
                  text-anchor="middle" dominant-baseline="middle">
              © ${new Date().getFullYear()} ${title}
            </text>
          </svg>
        `);

        // Process watermarked version (non-blocking)
        const watermarkedProcess = sharp(file.buffer)
          .composite([{
            input: await sharp(watermarkSvg)
              .rotate(-20, { background: 'transparent' })
              .toBuffer(),
            gravity: 'center',
            blend: 'overlay',
          }])
          .toFormat('jpeg')
          .jpeg({ quality: 80 })
          .toBuffer();

        // Wait for both versions
        const [originalBuffer, watermarkedBuffer] = await Promise.all([
          originalProcess,
          watermarkedProcess,
        ]);

        // Upload to Cloudinary (non-transactional)
        const [originalUpload, watermarkedUpload] = await Promise.all([
          this.cloudinary.uploadBuffer(originalBuffer, {
            folder: `events/${event.id}/originals`,
          }),
          this.cloudinary.uploadBuffer(watermarkedBuffer, {
            folder: `events/${event.id}/watermarks`,
          }),
        ]);

        // Create DB records (transactional)
        const originalImage = await prisma.eventImage.create({
          data: {
            url: originalUpload.secure_url,
            variant: 'ORIGINAL',
            order: index,
            event: { connect: { id: event.id } },
          },
        });

        await prisma.eventImage.create({
          data: {
            url: watermarkedUpload.secure_url,
            variant: 'WATERMARK',
            order: index,
            event: { connect: { id: event.id } },
            original: { connect: { id: originalImage.id } },
          },
        });

      } catch (error) {
        console.error(`Image ${index + 1} processing failed`, error);
        throw new InternalServerErrorException(
          `Failed to process image ${index + 1}: ${error.message}`,
        );
      }
    }

    // Return complete event data
    return prisma.event.findUnique({
      where: { id: event.id },
      include: {
        images: {
          include: { watermarks: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }, {
    maxWait: 30000, // 30 seconds max wait
    timeout: 30000, // 30 seconds timeout
  });
}



  async findAll() {
    return prisma.event.findMany({
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
    });
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
      // First delete associated images to maintain referential integrity
      await prisma.image.deleteMany({
        where: { id },
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
