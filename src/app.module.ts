import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }), AuthModule, PrismaModule, UsersModule, EventsModule],
  providers: [PrismaService, CloudinaryService],
})
export class AppModule {}