import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings') // Base URL: http://localhost:4000/bookings
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // GET /bookings/room/1?startDate=2026-08-10&endDate=2026-08-14
  // ดึงรายการจองตามห้องและวันที่ (สำหรับตารางหน้าเว็บ)
  @Get('room/:roomId')
  getBookingsByRoom(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.bookingsService.getBookingsByRoom(roomId, startDate, endDate);
  }

  // POST /bookings
  // ส่งคำขอจองห้องใหม่
  @Post()
  createBooking(
    @Body()
    body: {
      roomId: number;
      userId?: number;
      userName: string;
      userEmail?: string;
      phone?: string;
      lineId?: string;
      day: string;
      date: string;
      period: number;
      purpose: string;
    },
  ) {
    return this.bookingsService.createBooking(body);
  }

  // GET /bookings/pending
  // ดึงรายการรออนุมัติทั้งหมด (สำหรับหน้า Admin)
  @Get('pending')
  getPendingBookings() {
    return this.bookingsService.getPendingBookings();
  }

  // PATCH /bookings/:id/status
  // อัปเดตสถานะ (อนุมัติ / ปฏิเสธ)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'APPROVED' | 'REJECTED' | 'CANCELLED' },
  ) {
    return this.bookingsService.updateBookingStatus(id, body.status);
  }

  // GET /bookings/user/:userId
  // ดึงประวัติการจองของผู้ใช้คนนั้น
  @Get('user/:userId')
  getUserBookings(@Param('userId', ParseIntPipe) userId: number) {
    return this.bookingsService.getBookingsByUserId(userId);
  }

  // GET /bookings/room/1/full-schedule?startDate=2026-08-10&endDate=2026-08-14
  @Get('room/:roomId/full-schedule')
  getFullRoomSchedule(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.bookingsService.getFullRoomSchedule(roomId, startDate, endDate);
  }
}