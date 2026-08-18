import { Controller, Get, Post, Delete, Body, Param, Patch } from '@nestjs/common';
import { RoomsService } from './room.service';

@Controller('rooms')
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) {}

    @Get()
    getAllRooms() {
        return this.roomsService.findAllRooms();
    }

    // 🏢 ปรับเพิ่มให้รับ building (อาคาร)
    @Post()
    createRoom(@Body() body: { name: string; building?: string; category?: string }) {
        return this.roomsService.createRoom(body.name, body.building, body.category);
    }
    
    @Delete(':id')
    deleteRoom(@Param('id') id: string) {
        return this.roomsService.deleteRoom(Number(id));
    }

    @Get(':id/schedules')
    getSchedulesByRoom(@Param('id') id: string) {
        return this.roomsService.getSchedulesByRoom(Number(id));
    }

    @Post(':id/schedules')
    upsertSchedule(
        @Param('id') id: string,
        @Body() body: { day: string; period: number; subject: string; teacher: string; classroom: string },
    ) {
        return this.roomsService.upsertSchedule(Number(id), body);
    }

    @Delete(':roomId/schedules/:scheduleId')
    deleteSchedule(@Param('scheduleId') scheduleId: string) {
        return this.roomsService.deleteSchedule(Number(scheduleId));
    }

    // 🏢 ปรับเพิ่มให้รองรับการแก้ไข building (อาคาร)
    @Patch(':id')
    updateRoom(
        @Param('id') id: string,
        @Body() body: { name?: string; building?: string; category?: string },
    ) {
        return this.roomsService.updateRoom(Number(id), body);
    }
}