import { Controller, Post, Body, Headers, ForbiddenException, forwardRef, Inject, Req } from '@nestjs/common';
import * as crypto from 'crypto';
import { BookingsService } from 'src/bookings/bookings.service';
import { LineService } from './line.service';

@Controller('line/webhook')
export class LineWebhookController {
  private readonly channelSecret = process.env.LINE_CHANNEL_SECRET ?? '';

  constructor(
    @Inject(forwardRef(() => BookingsService))
    private bookingService: BookingsService,
    private lineService: LineService,
  ) {}

  @Post()
  async handleEvent(
    @Req() req: Request & { rawBody?: Buffer }, // รับ rawBody
    @Body() body: any,
    @Headers('x-line-signature') signature: string,
  ) {
    // ใช้ rawBody หากตั้งค่า rawBody: true ไว้ใน main.ts
    const raw = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(body);
    
    const hash = crypto
      .createHmac('sha256', this.channelSecret)
      .update(raw)
      .digest('base64');
    if (hash !== signature) {
      throw new ForbiddenException('Invalid signature');
    }

    for (const event of body.events) {
      if (event.type !== 'postback') continue;

      const params = new URLSearchParams(event.postback.data);
      const action = params.get('action');
      const bookingId = Number(params.get('bookingId'));
      const lineUserId = event.source.userId;

      switch (action) {
        // ขั้นที่ 1: กดปุ่ม "ยกเลิกการจอง" -> ส่งการ์ดยืนยันก่อน
        case 'cancel_request': {
          const booking = await this.bookingService.findById(bookingId);
          if (!booking) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'ไม่พบข้อมูลการจองนี้ครับ' },
            ]);
            break;
          }
          await this.lineService.sendCancelConfirmCard(event.replyToken, {
            roomName: booking.room.name,
            day: booking.day,
            date: booking.date,
            period: booking.period,
            bookingId: booking.id,
          });
          break;
        }

        // ขั้นที่ 2: กด "ยืนยันยกเลิก" -> เช็กสิทธิ์ + สถานะ แล้วยกเลิกจริง
        case 'cancel_confirm': {
          const booking = await this.bookingService.findById(bookingId);

          if (!booking) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'ไม่พบข้อมูลการจองนี้ครับ' },
            ]);
            break;
          }

          // เช็กสิทธิ์ตรงจาก lineId ที่เก็บไว้ในตัว booking เอง
          if (booking.lineId !== lineUserId) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'คุณไม่มีสิทธิ์ยกเลิกการจองนี้ครับ' },
            ]);
            break;
          }

          if (booking.status === 'CANCELLED') {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'การจองนี้ถูกยกเลิกไปแล้วครับ' },
            ]);
            break;
          }

          await this.bookingService.cancel(booking.id);
          await this.lineService.replyMessage(event.replyToken, [
            { type: 'text', text: `ยกเลิกการจองรหัส #${bookingId} เรียบร้อยแล้วครับ` },
          ]);
          break;
        }

        case 'cancel_abort': {
          await this.lineService.replyMessage(event.replyToken, [
            { type: 'text', text: 'ยกเลิกคำสั่ง ไม่มีการเปลี่ยนแปลงการจองครับ' },
          ]);
          break;
        }
      }
    }
    return { status: 'ok' };
  }
}