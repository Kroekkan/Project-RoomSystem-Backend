import {
  Injectable,
  BadRequestException,
  NotFoundException,
  forwardRef,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => LineService))
    private lineService: LineService,
  ) {}

  async getBookingsByRoom(
    roomId: number,
    startDate: string,
    endDate: string,
  ) {
    return this.prisma.booking.findMany({
      where: {
        roomId,
        date: { gte: startDate, lte: endDate },
        status: { in: ['PENDING', 'APPROVED'] },
      },
      orderBy: [{ date: 'asc' }, { period: 'asc' }],
    });
  }

  async createBooking(data: {
    roomId: number;
    userId?: number;
    userName: string;
    userEmail?: string;
    phone?: string;
    lineId?: string;
    day: string;
    date: string;
    period: string;
    purpose: string;
  }) {
    const existing = await this.prisma.booking.findFirst({
      where: {
        roomId: Number(data.roomId),
        date: data.date,
        period: data.period,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
      },
    });

    console.log('============================');
    console.log('CREATE BOOKING');
    console.log('roomId:', data.roomId);
    console.log('date:', data.date);
    console.log('period:', data.period);
    console.log('existing:', existing);
    console.log('============================');

    if (existing) {
      throw new BadRequestException(
        'คาบเวลานี้มีการจองหรืออยู่ระหว่างรอการอนุมัติอยู่แล้ว',
      );
    }

    const booking = await this.prisma.booking.create({
      data: {
        roomId: data.roomId,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        phone: data.phone,
        lineId: data.lineId,
        day: data.day,
        date: data.date,
        period: data.period,
        purpose: data.purpose,
        status: 'PENDING',
      },
      include: { room: true },
    });

    if (booking.lineId) {
      try {
        await this.lineService.sendBookingStatusCard(booking.lineId, {
          roomName: booking.room.name,
          category: booking.room.category,
          bookingId: booking.id,
          day: booking.day,
          date: booking.date,
          period: booking.period,
          status: booking.status,
          checkInTime: booking.checkInTime,
          checkOutTime: booking.checkOutTime,
        });
      } catch (lineErr: any) {
        console.error(
          'LINE Notification Error (แต่การจองสำเร็จแล้ว):',
          lineErr?.message || lineErr,
        );
      }
    }

    return booking;
  }

  async getAllBookings() {
    return this.prisma.booking.findMany({
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingBookings() {
    return this.prisma.booking.findMany({
      where: { status: 'PENDING' },
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBookingStatus(
    id: number,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
  ) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      throw new NotFoundException(`ไม่พบรายการจอง ID: ${id}`);
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status },
      include: { room: true },
    });

    if (updatedBooking.lineId) {
      await this.lineService.sendBookingStatusCard(updatedBooking.lineId, {
        roomName: updatedBooking.room.name,
        category: updatedBooking.room.category,
        bookingId: updatedBooking.id,
        day: updatedBooking.day,
        date: updatedBooking.date,
        period: updatedBooking.period,
        status: updatedBooking.status,
        checkInTime: updatedBooking.checkInTime,
        checkOutTime: updatedBooking.checkOutTime,
      });
    }

    return updatedBooking;
  }

  async deleteBooking(id: number) {
    try {
      return await this.prisma.booking.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`ไม่พบรายการจอง ID: ${id}`);
    }
  }

  async getBookingsByUserId(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFullRoomSchedule(
    roomId: number,
    startDate: string,
    endDate: string,
  ) {
    const schedules = await this.prisma.schedule.findMany({
      where: { roomId },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        roomId,
        date: { gte: startDate, lte: endDate },
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    return { schedules, bookings };
  }

  async findById(id: number) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: { room: true },
    });
  }

  async cancel(id: number) {
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { room: true },
    });

    if (updatedBooking.lineId) {
      await this.lineService.sendBookingStatusCard(updatedBooking.lineId, {
        roomName: updatedBooking.room.name,
        category: updatedBooking.room.category,
        bookingId: updatedBooking.id,
        day: updatedBooking.day,
        date: updatedBooking.date,
        period: updatedBooking.period,
        status: updatedBooking.status,
        checkInTime: updatedBooking.checkInTime,
        checkOutTime: updatedBooking.checkOutTime,
      });
    }

    return updatedBooking;
  }

  async checkIn(
    bookingId: number,
    userId: number,
    isAdmin: boolean,
    _time?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('ไม่พบรายการจองนี้');
    }

    if (!isAdmin && booking.userId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ทำรายการนี้');
    }

    if (booking.status !== 'APPROVED') {
      throw new BadRequestException(
        'ต้องเป็นรายการที่อนุมัติแล้วเท่านั้นถึงจะเช็คอินได้',
      );
    }

    if (booking.checkInTime) {
      throw new BadRequestException('ทำรายการเข้าห้องไปแล้ว');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { checkInTime: new Date() },
      include: { room: true },
    });

    // ส่งการ์ด LINE ใหม่ เพื่อแสดงเวลาเข้าห้องเรียน
    if (updatedBooking.lineId) {
      await this.lineService.sendBookingStatusCard(updatedBooking.lineId, {
        roomName: updatedBooking.room.name,
        category: updatedBooking.room.category,
        bookingId: updatedBooking.id,
        day: updatedBooking.day,
        date: updatedBooking.date,
        period: updatedBooking.period,
        status: updatedBooking.status,
        checkInTime: updatedBooking.checkInTime,
        checkOutTime: updatedBooking.checkOutTime,
      });
    }

    return updatedBooking;
  }

  async checkOut(
    bookingId: number,
    userId: number,
    isAdmin: boolean,
    _time?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('ไม่พบรายการจองนี้');
    }

    if (!isAdmin && booking.userId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ทำรายการนี้');
    }

    if (!booking.checkInTime) {
      throw new BadRequestException('ต้องเช็คอินก่อนถึงจะเช็คเอาท์ได้');
    }

    if (booking.checkOutTime) {
      throw new BadRequestException('ทำรายการออกห้องไปแล้ว');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { checkOutTime: new Date() },
      include: { room: true },
    });

    // ส่งการ์ด LINE ใหม่ เพื่อแสดงเวลาออกจากห้องเรียน
    if (updatedBooking.lineId) {
      await this.lineService.sendBookingStatusCard(updatedBooking.lineId, {
        roomName: updatedBooking.room.name,
        category: updatedBooking.room.category,
        bookingId: updatedBooking.id,
        day: updatedBooking.day,
        date: updatedBooking.date,
        period: updatedBooking.period,
        status: updatedBooking.status,
        checkInTime: updatedBooking.checkInTime,
        checkOutTime: updatedBooking.checkOutTime,
      });
    }

    return updatedBooking;
  }
}