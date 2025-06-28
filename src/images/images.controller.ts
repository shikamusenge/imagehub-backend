import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { ImagesService } from './images.service';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { UploadImageDto } from './dto/dto/upload-image.dto';
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}
@Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload single image with eventId and optional description',
    schema: {
      type: 'object',
      properties: {
        eventId: { type: 'integer', example: 1 },
        description: { type: 'string', example: 'Event banner image' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['eventId', 'file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single event image with watermarking' })
  create(
 @Body() dto: UploadImageDto,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: 'image/*' }),
      ],
    })
  )
  file: Express.Multer.File,
) {
  // Map UploadImageDto to CreateImageDto with placeholder values for url and variant
  const createImageDto: CreateImageDto = {
    ...dto,
    url: '', // Placeholder, will be set in service after upload
    variant: 'ORIGINAL', // or any default value as needed
  };
  return this.imagesService.create(createImageDto, file);
}

  @Get()
  findAll() {
    return this.imagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.imagesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateImageDto: UpdateImageDto) {
    return this.imagesService.update(+id, updateImageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.imagesService.remove(+id);
  }
}
