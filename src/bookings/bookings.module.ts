import { Module, forwardRef } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { LineModule } from 'src/line/line.module';
import { PrismaService } from '../prisma/prisma.service'; // แก้ไข path ตามโครงการของคุณ

@Module({
  imports: [forwardRef(() => LineModule)],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
  exports: [BookingsService],
})
export class BookingsModule {}