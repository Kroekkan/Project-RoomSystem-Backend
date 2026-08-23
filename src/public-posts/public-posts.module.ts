import { Module } from '@nestjs/common';
import { PublicPostsController } from './public-posts.controller';
import { PublicPostsService } from './public-posts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicPostsController],
  providers: [PublicPostsService],
})
export class PublicPostsModule {}