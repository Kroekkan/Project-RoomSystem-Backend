import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class LineAuthService {
  private readonly clientId = process.env.LINE_LOGIN_CHANNEL_ID ?? '';
  private readonly clientSecret = process.env.LINE_LOGIN_CHANNEL_SECRET ?? '';
  private readonly callbackUrl = process.env.LINE_LOGIN_CALLBACK_URL || 'https://project-roomsystem-backend.onrender.com/auth/line/callback';
  
  // 🟢 เพิ่ม Channel Access Token สำหรับส่งข้อความ (Messaging API)
  private readonly channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '';

  getAuthorizationUrl(): string {
    const state = Math.random().toString(36).substring(7);
    const scope = 'profile openid';
    
    return (
      `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code` +
      `&client_id=${this.clientId}` +
      `&redirect_uri=${encodeURIComponent(this.callbackUrl)}` +
      `&state=${state}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&prompt=consent`
    );
  }

  async getLineUserProfile(code: string): Promise<{ userId: string; displayName: string; pictureUrl?: string }> {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', this.callbackUrl);
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);

      const tokenResponse = await axios.post(
        'https://api.line.me/oauth2/v2.1/token',
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const accessToken = tokenResponse.data.access_token;

      const profileResponse = await axios.get('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        userId: profileResponse.data.userId,
        displayName: profileResponse.data.displayName,
        pictureUrl: profileResponse.data.pictureUrl,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('Error exchanging LINE Login code:', error.response?.data || error.message);
      } else {
        console.error('Error exchanging LINE Login code:', error);
      }
      throw new BadRequestException('ไม่สามารถยืนยันตัวตนกับ LINE ได้');
    }
  }

  // 🟢 เพิ่มเมธอด pushMessage สำหรับส่งข้อความหรือ Flex Message ไปหาผู้ใช้/แอดมิน
  async pushMessage(to: string, messages: any) {
    try {
      const payloadMessages = Array.isArray(messages) ? messages : [messages];
      
      await axios.post(
        'https://api.line.me/v2/bot/message/push',
        {
          to: to,
          messages: payloadMessages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.channelAccessToken}`,
          },
        },
      );
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('Error pushing LINE message:', error.response?.data || error.message);
      } else {
        console.error('Error pushing LINE message:', error);
      }
      throw error;
    }
  }

  async sendAdminBookingNotification(
    adminLineId: string,
    booking: {
      bookingId: number;
      userName: string;
      userEmail?: string;
      phone?: string;
      purpose?: string;
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
                  text: `${booking.roomName}\n${booking.day} ${formatBookingDate(booking.date)}\nคาบที่ ${booking.period}`, 
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
}