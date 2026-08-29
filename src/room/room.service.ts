import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
    constructor(private prisma: PrismaService) {}

    // 🏢 ค้นหาห้อง (เรียงตาม อาคาร -> ชื่อห้อง)
    async findAllRooms() {
        return this.prisma.room.findMany({
            orderBy: [{ building: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { schedules: true } } },
        });
    }

    // 🏢 ปรับเพิ่มห้อง ให้รับ building ด้วย
    async createRoom(name: string, building?: string, category?: string) {
        return this.prisma.room.create({
            data: {
                name,
                building: building || 'อาคาร 1',
                category: category || 'ห้องเรียนทั่วไป',
            },
        });
    }

    // ลบห้อง (Cascade ลบตารางทั้งหมดของห้องนั้นด้วย)
    async deleteRoom(id: number) {
        try {
            return await this.prisma.room.delete({ where: { id } });
        } catch {
            throw new NotFoundException(`ไม่พบห้อง ID: ${id}`);
        }
    }

    // ดึงตารางสอนของห้อง
    async getSchedulesByRoom(roomId: number) {
        return this.prisma.schedule.findMany({
            where: { roomId },
            orderBy: [{ day: 'asc' }, { period: 'asc' }],
        });
    }

    // เพิ่ม/แก้ไขคาบเรียน (Upsert)
    async upsertSchedule(
        roomId: number,
        data: { day: string; period: string; subject: string; teacher: string; classroom: string },
    ) {
        return this.prisma.schedule.upsert({
            where: {
                roomId_day_period: { roomId, day: data.day, period: data.period },
            },
            update: {
                subject: data.subject,
                teacher: data.teacher,
                classroom: data.classroom,
            },
            create: {
                roomId,
                day: data.day,
                period: data.period,
                subject: data.subject,
                teacher: data.teacher,
                classroom: data.classroom,
            },
        });
    }

    // ลบคาบเรียน
    async deleteSchedule(id: number) {
        return this.prisma.schedule.delete({ where: { id } });
    }

    // 🏢 เพิ่มฟังก์ชันแก้ไขชื่อ อาคาร และหมวดหมู่ห้อง
    async updateRoom(id: number, data: { name?: string; building?: string; category?: string }) {
        try {
            return await this.prisma.room.update({
                where: { id },
                data,
            });
        } catch {
            throw new NotFoundException(`ไม่พบห้อง ID: ${id}`);
        }
    }
}