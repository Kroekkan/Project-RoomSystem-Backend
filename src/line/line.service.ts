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

    // ยกเลิกได้เฉพาะก่อนเข้าห้องเรียนเท่านั้น
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
      });
    };

    const footerContents: any[] = [];

    // อนุมัติแล้ว และยังไม่เข้าห้อง → แสดงปุ่มเข้าห้องเรียน
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

    // เข้าห้องแล้ว และยังไม่ออก → เปลี่ยนเป็นปุ่มออกจากห้องเรียน
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

    // แสดงปุ่มยกเลิกเสมอ หากยังไม่ถูกยกเลิกหรือปฏิเสธ
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

    const periodTimes: Record<number, string> = {
      1: '08:30 - 09:20',
      2: '09:20 - 10:10',
      3: '10:40 - 11:30',
      4: '11:30 - 12:20',
      5: '12:20 - 13:10',
      6: '13:10 - 14:00',
      7: '14:00 - 14:50',
      8: '14:50 - 15:40',
      9: '15:40 - 16:30',
    };

    const periodLabel = `คาบที่ ${booking.period} (${periodTimes[booking.period] ?? '-'})`;

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
            { type: 'text', text: `${booking.day} ${booking.date} | คาบที่ ${booking.period}`, size: 'xs', color: '#999999' },
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