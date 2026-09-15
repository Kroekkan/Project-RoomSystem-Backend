import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class LineService {
  private readonly token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  private readonly headers = {
    Authorization: `Bearer ${this.token}`,
    'Content-Type': 'application/json',
  };

  // ---------- ส่งข้อความทั่วไป ----------
  async pushMessage(userId: string, messages: any[]) {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      { to: userId, messages },
      { headers: this.headers },
    );
  }

  async replyMessage(replyToken: string, messages: any[]) {
    await axios.post(
      'https://api.line.me/v2/bot/message/reply',
      { replyToken, messages },
      { headers: this.headers },
    );
  }

  // ---------- Helper: แปลง period จริงจาก DB ให้ตรงกับ label ที่ผู้ใช้เห็นในตาราง ----------
  // period 3 ใน DB = ช่วงพัก 30 นาที (ไม่ใช่คาบเรียน)
  // period 4 เป็นต้นไป ต้องลบ 1 เพื่อให้ตรงกับ "คาบ" ที่แสดงบนตารางฝั่งผู้ใช้
  private readonly periodClockTimes: Record<number, string> = {
    1: '08:30 - 09:20',
    2: '09:20 - 10:10',
    3: '10:10 - 10:40', // พัก 30 นาที
    4: '10:40 - 11:30',
    5: '11:30 - 12:20',
    6: '12:20 - 13:10',
    7: '13:10 - 14:00',
    8: '14:00 - 14:50',
    9: '14:50 - 15:40',
    10: '15:40 - 16:30',
  };

  private getPeriodLabel(rawPeriod: number | string): string {
    const p = Number(rawPeriod);

    if (p === 3) {
      return 'พัก 30';
    }

    return `คาบที่ ${p > 3 ? p - 1 : p}`;
  }

  private getPeriodClockTime(rawPeriod: number | string): string {
    const p = Number(rawPeriod);
    return this.periodClockTimes[p] ?? '-';
  }

  // ---------- ส่วนที่ 1: การ์ดแจ้งสถานะการจอง (พร้อมปุ่มยกเลิก) ----------
  async sendBookingStatusCard(
    lineId: string,
    booking: {
      roomName: string;
      category: string;
      bookingId: number;
      day: string;
      date: string;
      period: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
      checkInTime?: Date | string | null;
      checkOutTime?: Date | string | null;
    },
  ) {
    const statusMap = {
      PENDING: { text: 'รอดำเนินการ', color: '#FFB800' },
      APPROVED: { text: 'อนุมัติแล้ว', color: '#06C755' },
      REJECTED: { text: 'ถูกปฏิเสธ', color: '#FF3B30' },
      CANCELLED: { text: 'ยกเลิกแล้ว', color: '#999999' },
    };

    const statusInfo = statusMap[booking.status];
    const isApproved = booking.status === 'APPROVED';
    const hasCheckedIn = !!booking.checkInTime;
    const hasCheckedOut = !!booking.checkOutTime;

    const canCancel =
      booking.status !== 'CANCELLED' &&
      booking.status !== 'REJECTED' &&
      !hasCheckedIn &&
      !hasCheckedOut;

    const formatTime = (time?: Date | string | null) => {
      if (!time) return '-';

      return new Date(time).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok',
      });
    };

    const footerContents: any[] = [];

    if (isApproved && !hasCheckedIn && !hasCheckedOut) {
      footerContents.push({
        type: 'button',
        style: 'primary',
        color: '#06C755',
        action: {
          type: 'postback',
          label: 'เข้าห้องเรียน',
          data: `action=checkin&bookingId=${booking.bookingId}`,
          displayText: `ต้องการเข้าห้องเรียน ${booking.roomName}`,
        },
      });
    }

    if (isApproved && hasCheckedIn && !hasCheckedOut) {
      footerContents.push({
        type: 'button',
        style: 'primary',
        color: '#FF9500',
        action: {
          type: 'postback',
          label: 'ออกจากห้องเรียน',
          data: `action=checkout&bookingId=${booking.bookingId}`,
          displayText: `ต้องการออกจากห้องเรียน ${booking.roomName}`,
        },
      });
    }

    if (canCancel) {
      footerContents.push({
        type: 'button',
        style: 'secondary',
        margin: footerContents.length > 0 ? 'sm' : undefined,
        action: {
          type: 'postback',
          label: 'ยกเลิกการจอง',
          data: `action=cancel_request&bookingId=${booking.bookingId}`,
          displayText: `ต้องการยกเลิกการจอง ${booking.roomName}`,
        },
      });
    }

    // ใช้ helper แทนการต่อ string จาก raw period ตรง ๆ
    const periodLabel = `${this.getPeriodLabel(booking.period)} (${this.getPeriodClockTime(booking.period)})`;

    const formatBookingDate = (date: string) => {
      const [year, month, day] = date.split('-');

      if (!year || !month || !day) return date;

      return `${day}/${month}/${year}`;
    };

    const flexMessage = {
      type: 'flex',
      altText: `สถานะการจองห้อง ${booking.roomName}: ${statusInfo.text}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'Roomify',
              size: 'sm',
              color: '#06C755',
              weight: 'bold',
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'สถานะ',
                  size: 'sm',
                  color: '#999999',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: statusInfo.text,
                  size: 'sm',
                  color: statusInfo.color,
                  weight: 'bold',
                  align: 'end',
                },
              ],
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: booking.roomName,
              weight: 'bold',
              size: 'lg',
              wrap: true,
            },
            {
              type: 'text',
              text: booking.category,
              size: 'xs',
              color: '#999999',
            },
            { type: 'separator', margin: 'md' },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              spacing: 'xs',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: 'วันที่', size: 'xs', color: '#999999', flex: 2 },
                    {
                      type: 'text',
                      text: `${booking.day} ${formatBookingDate(booking.date)}`,
                      size: 'xs',
                      flex: 3,
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'text',
                  text: periodLabel,
                  size: 'xs',
                  flex: 3,
                  align: 'end',
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: 'เวลาเข้าห้อง', size: 'xs', color: '#999999', flex: 2 },
                    {
                      type: 'text',
                      text: formatTime(booking.checkInTime),
                      size: 'xs',
                      flex: 3,
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: 'เวลาออกห้อง', size: 'xs', color: '#999999', flex: 2 },
                    {
                      type: 'text',
                      text: formatTime(booking.checkOutTime),
                      size: 'xs',
                      flex: 3,
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: 'รหัสจอง', size: 'xs', color: '#999999', flex: 2 },
                    {
                      type: 'text',
                      text: `#${booking.bookingId}`,
                      size: 'xs',
                      flex: 3,
                      align: 'end',
                    },
                  ],
                },
              ],
            },
          ],
        },
        footer:
          footerContents.length > 0
            ? {
                type: 'box',
                layout: 'vertical',
                contents: footerContents,
              }
            : undefined,
      },
    };

    await this.pushMessage(lineId, [flexMessage]);
  }

  async sendAdminBookingNotification(
    adminLineId: string,
    booking: {
      bookingId: number;
      userName: string;
      userEmail?: string | null;  // เพิ่ม | null
      phone?: string | null;      // เพิ่ม | null
      purpose?: string | null;
      roomName: string;
      category: string;
      day: string;
      date: string;
      period: string | number;
    },
  ) {
    const formatBookingDate = (dateStr: string) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      if (!year || !month || !day) return dateStr;
      const thaiYear = parseInt(year) + 543;
      const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return `${parseInt(day)} ${monthsTh[parseInt(month) - 1]} ${thaiYear}`;
    };

    const flexMessage = {
      type: 'flex',
      altText: `มีคำขอจองห้องใหม่: ${booking.roomName} (${booking.userName})`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: 'Roomify - คำขอจองใหม่', weight: 'bold', color: '#06C755', size: 'sm' },
            { type: 'text', text: 'รออนุมัติ', align: 'end', weight: 'bold', color: '#E5A900', size: 'sm', gravity: 'center' }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text', text: booking.userName, weight: 'bold', size: 'lg', color: '#111111' },
            { type: 'text', text: booking.userEmail || '-', size: 'xs', color: '#666666' },
            { type: 'separator', margin: 'md' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                { type: 'text', text: 'ห้อง / วัน / คาบ', size: 'xs', color: '#555555', flex: 2 },
                { 
                  type: 'text', 
                  text: `${booking.roomName}\n${booking.day} ${formatBookingDate(booking.date)}\n${this.getPeriodLabel(booking.period)}`, 
                  size: 'xs', 
                  color: '#111111', 
                  align: 'end', 
                  flex: 3, 
                  wrap: true 
                }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                { type: 'text', text: 'รายละเอียด', size: 'xs', color: '#555555', flex: 2 },
                { type: 'text', text: booking.purpose || '-', size: 'xs', color: '#111111', align: 'end', flex: 3, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                { type: 'text', text: 'ช่องทางติดต่อ', size: 'xs', color: '#555555', flex: 2 },
                { type: 'text', text: booking.phone || '-', size: 'xs', color: '#111111', align: 'end', flex: 3 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                { type: 'text', text: 'รหัสจอง', size: 'xs', color: '#555555', flex: 2 },
                { type: 'text', text: `#${booking.bookingId}`, size: 'xs', color: '#111111', align: 'end', flex: 3, weight: 'bold' }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'md',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#06C755',
              height: 'sm',
              action: {
                type: 'postback',
                label: 'อนุมัติ',
                data: `action=admin_approve&bookingId=${booking.bookingId}`
              }
            },
            {
              type: 'button',
              style: 'primary',
              color: '#FF334B',
              height: 'sm',
              action: {
                type: 'postback',
                label: 'ปฏิเสธ',
                data: `action=admin_reject&bookingId=${booking.bookingId}`
              }
            }
          ]
        }
      }
    };

    await this.pushMessage(adminLineId, [flexMessage]);
  }

  // ---------- ส่วนที่ 2 และ 3: การ์ดยืนยันก่อนยกเลิกจริง ----------
  async sendCancelConfirmCard(replyToken: string, booking: {
    roomName: string;
    day: string;
    date: string;
    period: string;
    bookingId: number;
  }) {
    const confirmFlex = {
      type: 'flex',
      altText: 'ยืนยันการยกเลิกการจอง',
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            { type: 'text', text: '⚠️ ยืนยันการยกเลิก', weight: 'bold', size: 'md', color: '#FF3B30' },
            { type: 'separator' },
            { type: 'text', text: booking.roomName, weight: 'bold', size: 'md', wrap: true, margin: 'md' },
            {
              type: 'text',
              text: `${booking.day} ${booking.date} | ${this.getPeriodLabel(booking.period)}`,
              size: 'xs',
              color: '#999999',
            },
            { type: 'text', text: `รหัสจอง: #${booking.bookingId}`, size: 'xs', color: '#999999' },
            { type: 'text', text: 'ต้องการยกเลิกการจองนี้ใช่หรือไม่?', size: 'sm', margin: 'md', wrap: true },
          ],
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'postback',
                label: 'ไม่ยกเลิก',
                data: `action=cancel_abort&bookingId=${booking.bookingId}`,
                displayText: 'ไม่ยกเลิกการจอง',
              },
            },
            {
              type: 'button',
              style: 'primary',
              color: '#FF3B30',
              action: {
                type: 'postback',
                label: 'ยืนยันยกเลิก',
                data: `action=cancel_confirm&bookingId=${booking.bookingId}`,
                displayText: 'ยืนยันยกเลิกการจอง',
              },
            },
          ],
        },
      },
    };

    await this.replyMessage(replyToken, [confirmFlex]);
  }
}