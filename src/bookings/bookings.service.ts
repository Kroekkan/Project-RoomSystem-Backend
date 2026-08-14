import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // แก้ไข path ตามโครงสร้างของคุณ

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // 1. ดึงรายการจองของห้อง ตามช่วงวันที่ (สำหรับหน้า User แสดงตาราง)
  async getBookingsByRoom(roomId: number, startDate: string, endDate: string) {
    return this.prisma.booking.findMany({
      where: {
        roomId,
        date: { gte: startDate, lte: endDate },
        status: { in: ['PENDING', 'APPROVED'] }, // ดึงเฉพาะรออนุมัติ และ อนุมัติแล้ว
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
    // เช็กว่าช่องนี้มีคนจองไว้แล้วหรือไม่ (สถานะ PENDING หรือ APPROVED)
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

    return this.prisma.booking.create({
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
        status: 'PENDING', // ค่าเริ่มต้นเป็นรออนุมัติ
      },
    });
  }

  // 3. ดึงรายการจองทั้งหมดที่รออนุมัติ (สำหรับหน้า Admin ตรวจสอบ)
  async getPendingBookings() {
    return this.prisma.booking.findMany({
      where: { status: 'PENDING' },
      include: { room: true }, // ดึงข้อมูลห้องมาด้วย
      orderBy: { createdAt: 'desc' },
    });
  }

  // 4. Admin อนุมัติ หรือ ปฏิเสธ การจอง
  async updateBookingStatus(id: number, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') {
    const booking = await this.prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      throw new NotFoundException(`ไม่พบรายการจอง ID: ${id}`);
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status },
    });
  }

  // 5. ดึงรายการจองตาม ID ของผู้ใช้งาน (ดูประวัติการจองตัวเอง)
  async getBookingsByUserId(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // เพิ่มฟังก์ชันดึงข้อมูลรวม 2 ตาราง
  async getFullRoomSchedule(roomId: number, startDate: string, endDate: string) {
    // 1. ดึงตารางเรียนประจำที่ Admin บันทึกไว้
    const schedules = await this.prisma.schedule.findMany({
      where: { roomId },
    });

    // 2. ดึงรายการจองจากฝั่ง User
    const bookings = await this.prisma.booking.findMany({
      where: {
        roomId,
        date: { gte: startDate, lte: endDate },
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    return {
      schedules, // ข้อมูลตารางสอน Admin
      bookings,  // ข้อมูลการจอง User
    };
  }
}