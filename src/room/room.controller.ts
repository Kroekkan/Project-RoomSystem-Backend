import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { RoomsService } from './room.service';

@Controller('rooms')
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) {}

    @Get()
    getAllRooms() {
        return this.roomsService.findAllRooms();
    }

    @Post()
    createRoom(@Body() body: { name: string }) {
        return this.roomsService.createRoom(body.name);
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
}