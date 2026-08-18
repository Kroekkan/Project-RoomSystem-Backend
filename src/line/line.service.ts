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
  async sendBookingStatusCard(lineId: string, booking: {
    roomName: string;
    category: string;
    bookingId: number;
    day: string;
    date: string;
    period: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  }) {
    const statusMap = {
      PENDING: { text: 'รอดำเนินการ', color: '#FFB800' },
      APPROVED: { text: 'อนุมัติแล้ว', color: '#06C755' },
      REJECTED: { text: 'ถูกปฏิเสธ', color: '#FF3B30' },
      CANCELLED: { text: 'ยกเลิกแล้ว', color: '#999999' },
    };
    const statusInfo = statusMap[booking.status];
    const canCancel = booking.status !== 'CANCELLED' && booking.status !== 'REJECTED';

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
            { type: 'text', text: 'Book A Room', size: 'sm', color: '#06C755', weight: 'bold' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                { type: 'text', text: 'สถานะ', size: 'sm', color: '#999999', flex: 0 },
                { type: 'text', text: statusInfo.text, size: 'sm', color: statusInfo.color, weight: 'bold', align: 'end' },
              ],
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text', text: booking.roomName, weight: 'bold', size: 'lg', wrap: true },
            { type: 'text', text: booking.category, size: 'xs', color: '#999999' },
            { type: 'separator', margin: 'md' },
            {
              type: 'box', layout: 'vertical', margin: 'md', spacing: 'xs',
              contents: [
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'วันที่', size: 'xs', color: '#999999', flex: 2 },
                  { type: 'text', text: `${booking.day} ${booking.date}`, size: 'xs', flex: 3, align: 'end' },
                ]},
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'คาบเรียน', size: 'xs', color: '#999999', flex: 2 },
                  { type: 'text', text: `คาบที่ ${booking.period}`, size: 'xs', flex: 3, align: 'end' },
                ]},
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'รหัสจอง', size: 'xs', color: '#999999', flex: 2 },
                  { type: 'text', text: `#${booking.bookingId}`, size: 'xs', flex: 3, align: 'end' },
                ]},
              ],
            },
          ],
        },
        footer: canCancel ? {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#FF3B30',
              action: {
                type: 'postback',
                label: 'ยกเลิกการจอง',
                data: `action=cancel_request&bookingId=${booking.bookingId}`,
                displayText: `ต้องการยกเลิกการจอง ${booking.roomName}`,
              },
            },
          ],
        } : undefined,
      },
    };

    await this.pushMessage(lineId, [flexMessage]);
  }

  // ---------- ส่วนที่ 2 และ 3: การ์ดยืนยันก่อนยกเลิกจริง ----------
  async sendCancelConfirmCard(replyToken: string, booking: {
    roomName: string;
    day: string;
    date: string;
    period: number;
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