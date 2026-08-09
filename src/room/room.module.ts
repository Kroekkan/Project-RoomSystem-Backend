import { Module } from '@nestjs/common';
import { RoomsController } from './room.controller';
import { RoomsService } from './room.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [RoomsController],
    providers: [RoomsService, PrismaService],
})
export class RoomsModule {}