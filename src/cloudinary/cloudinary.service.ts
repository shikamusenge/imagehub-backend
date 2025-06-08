// cloudinary.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: "dieopqxfn",
      api_key: "726426687826284",
      api_secret: "ksnkjmQtzUi3VdJZXdAYBdT9Tic",
      timeout: 60000
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    options: Record<string, any>
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      if (!buffer || buffer.length === 0) {
        this.logger.error('Upload failed: Empty buffer provided');
        return reject(new Error('Cannot upload empty file'));
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            this.logger.error(`Upload failed: ${error.message}`, error.stack);
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          
          if (!result) {
            this.logger.error('Upload failed: No result returned from Cloudinary');
            return reject(new Error('Cloudinary returned no response'));
          }

          if (!result.secure_url) {
            this.logger.error('Upload incomplete: Missing secure_url', result);
            return reject(new Error('Cloudinary upload incomplete - missing URL'));
          }

          this.logger.log(`Upload successful: ${result.public_id}`);
          resolve(result!);
        }
      );

      uploadStream.on('error', (error) => {
        this.logger.error('Upload stream error:', error);
        reject(new Error('File upload stream error'));
      });

      uploadStream.end(buffer);
    });
  }
}