import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles, BadRequestException, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { EventWithRelations } from './dto/event-response.dto'
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { EventQueryDto } from './dto/eventQueryDto';
import { log } from 'node:console';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}
  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Create a new event with images' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiConsumes('multipart/form-data')
@ApiBody({
  description: 'Create new event with images',
  schema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'string',
          format: 'binary',
        },
        description: 'Event images (multiple allowed)',
      },
      imageDescriptions: {
        type: 'array',
        items: { type: 'string' },
        example: ['Front stage view', 'Crowd dancing']
      },
      title: { type: 'string', example: 'Summer Festival' },
      description: { type: 'string', example: 'Annual summer music festival' },
      date: { type: 'string', format: 'date-time', example: '2023-07-15T18:00:00Z' },
      location: { type: 'string', example: 'Central Park' },
      userId: { type: 'number', example: 1 },
    },
    required: ['files', 'title', 'date', 'location', 'userId'],
  },
})
  async create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    // Validate file types and sizes if needed
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new BadRequestException(`File too large: ${file.originalname}`);
      }
    }
    console.log(createEventDto);
    return this.eventsService.create(createEventDto, files);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of events',
    description: 'Retrieves events with optional filters for date range and image types'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
    example: 10
  })
  @ApiQuery({
    name: 'upcoming',
    required: false,
    description: 'Filter only upcoming events',
    type: Boolean,
    example: false
  })
  @ApiQuery({
    name: 'originals',
    required: false,
    description: 'Include original images (default: true)',
    type: Boolean,
    example: true
  })
  @ApiQuery({
    name: 'watermarks',
    required: false,
    description: 'Include watermarked images (default: false)',
    type: Boolean,
    example: false
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of events',
    type: [EventWithRelations]
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('upcoming') upcoming?: string,
    @Query('originals') originals?: string,
    @Query('watermarks') watermarks?: string
  ): Promise<EventWithRelations[]> {
    // Convert and validate query parameters
    const parsedPage = Math.max(1, parseInt(page, 10)) || 1;
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10))) || 10;
    const parsedUpcoming = upcoming?.toLowerCase() === 'true';
    const parsedOriginals = originals ? originals.toLowerCase() === 'true' : true;
    const parsedWatermarks = watermarks?.toLowerCase() === 'true';

    return this.eventsService.findAll({
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
      upcomingOnly: parsedUpcoming,
      includeOriginals: parsedOriginals,
      includeWatermarks: parsedWatermarks
    });
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(+id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(+id);
  }
}
