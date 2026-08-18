import { Injectable, BadRequestException, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => LineService))
    private lineService: LineService,
  ) {}

  // 1. ดึงรายการจองของห้อง ตามช่วงวันที่ (สำหรับหน้า User แสดงตาราง)
  async getBookingsByRoom(roomId: number, startDate: string, endDate: string) {
    return this.prisma.booking.findMany({
      where: {
        roomId,
        date: { gte: startDate, lte: endDate },
        status: { in: ['PENDING', 'APPROVED'] },
      },
      orderBy: [{ date: 'asc' }, { period: 'asc' }],
    });
  }

    // 2. ส่งคำขอจองห้องใหม่ (สำหรับ User)
  async createBooking(data: {
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
  }) {
    const existing = await this.prisma.booking.findFirst({
      where: {
        roomId: data.roomId,
        date: data.date,
        period: data.period,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existing) {
      throw new BadRequestException('คาบเวลานี้มีการจองหรืออยู่ระหว่างรอการอนุมัติอยู่แล้ว');
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

    // 🟢 ครอบ try...catch ป้องกันไม่ให้ LINE Error ทำระบบจองห้องพัง
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
        });
      } catch (lineErr: any) {
        console.error('LINE Notification Error (แต่การจองสำเร็จแล้ว):', lineErr?.message || lineErr);
      }
    }

    return booking;
  }

  // 3. ดึงรายการจองทั้งหมด ทุกสถานะ (สำหรับหน้า Admin)
  async getAllBookings() {
    return this.prisma.booking.findMany({
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 4. ดึงรายการจองเฉพาะที่รออนุมัติ
  async getPendingBookings() {
    return this.prisma.booking.findMany({
      where: { status: 'PENDING' },
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🟢 5. Admin อนุมัติ หรือ ปฏิเสธ การจอง (เพิ่มการส่งแจ้งเตือนเข้า LINE)
  async updateBookingStatus(id: number, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') {
    const booking = await this.prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      throw new NotFoundException(`ไม่พบรายการจอง ID: ${id}`);
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status },
      include: { room: true }, // 🟢 include ข้อมูลห้องเพิ่มเติม
    });

    // 🟢 ส่งการ์ดแจ้งเตือนสถานะใหม่เข้า LINE ของผู้ใช้ทันที
    if (updatedBooking.lineId) {
      await this.lineService.sendBookingStatusCard(updatedBooking.lineId, {
        roomName: updatedBooking.room.name,
        category: updatedBooking.room.category,
        bookingId: updatedBooking.id,
        day: updatedBooking.day,
        date: updatedBooking.date,
        period: updatedBooking.period,
        status: updatedBooking.status,
      });
    }

    return updatedBooking;
  }

  // 6. ลบรายการจอง
  async deleteBooking(id: number) {
    try {
      return await this.prisma.booking.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`ไม่พบรายการจอง ID: ${id}`);
    }
  }

  // 7. ดึงรายการจองตาม ID ของผู้ใช้งาน
  async getBookingsByUserId(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 8. ดึงข้อมูลรวม 2 ตาราง (ตารางสอนประจำ + การจอง)
  async getFullRoomSchedule(roomId: number, startDate: string, endDate: string) {
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

  // 9. ดึง booking ตาม id พร้อมข้อมูลห้อง (ใช้ในระบบยกเลิกผ่าน LINE)
  async findById(id: number) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: { room: true },
    });
  }

  // 🟢 10. ยกเลิก booking (ใช้ในระบบยกเลิกผ่าน LINE)
  async cancel(id: number) {
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { room: true },
    });

    // 🟢 อัปเดตส่งการ์ดสถานะใหม่กลับเข้า LINE
    if (updatedBooking.lineId) {
      await this.lineService.sendBookingStatusCard(updatedBooking.lineId, {
        roomName: updatedBooking.room.name,
        category: updatedBooking.room.category,
        bookingId: updatedBooking.id,
        day: updatedBooking.day,
        date: updatedBooking.date,
        period: updatedBooking.period,
        status: updatedBooking.status,
      });
    }

    return updatedBooking;
  }
}