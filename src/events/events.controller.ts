import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';

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
        title: { type: 'string', example: 'Summer Festival' },
        description: { type: 'string', example: 'Annual summer music festival' },
        date: { type: 'string', format: 'date-time', example: '2023-07-15T18:00:00Z' },
        location: { type: 'string', example: 'Central Park' },
        userId: { type: 'number', example: 1 },
      },
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

    return this.eventsService.create(createEventDto, files);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
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
