import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ArticlesModule } from './articles/articles.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [UsersModule, AuthModule, ProductsModule, OrdersModule, PrismaModule, ArticlesModule],
  providers: [PrismaService],
})
export class AppModule {}