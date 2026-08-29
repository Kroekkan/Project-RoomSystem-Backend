import {
  Controller,
  Post,
  Body,
  Headers,
  ForbiddenException,
  forwardRef,
  Inject,
  Req,
} from '@nestjs/common';
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
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: any,
    @Headers('x-line-signature') signature: string,
  ) {
    const raw = req.rawBody
      ? req.rawBody.toString('utf-8')
      : JSON.stringify(body);

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

      if (!bookingId || !lineUserId) continue;

      switch (action) {
        case 'checkin': {
          const booking = await this.bookingService.findById(bookingId);

          if (!booking) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'ไม่พบข้อมูลการจองนี้ครับ' },
            ]);
            break;
          }

          if (booking.lineId !== lineUserId) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'คุณไม่มีสิทธิ์เช็กอินการจองนี้ครับ' },
            ]);
            break;
          }

          if (booking.userId === null) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'ไม่พบข้อมูลผู้จองสำหรับรายการนี้ครับ' },
            ]);
            break;
          }

          if (booking.status !== 'APPROVED') {
            await this.lineService.replyMessage(event.replyToken, [
              {
                type: 'text',
                text: 'สามารถเข้าห้องเรียนได้เฉพาะรายการที่อนุมัติแล้วครับ',
              },
            ]);
            break;
          }

          if (booking.checkInTime) {
            await this.lineService.replyMessage(event.replyToken, [
              {
                type: 'text',
                text: `คุณเข้าห้องเรียนแล้ว เวลา ${new Date(
                  booking.checkInTime,
                ).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} น.`,
              },
            ]);
            break;
          }

          const actionTime = new Date().toISOString();

          await this.bookingService.checkIn(
            booking.id,
            booking.userId,
            false,
            actionTime,
          );

          await this.lineService.replyMessage(event.replyToken, [
            {
              type: 'text',
              text: `เข้าห้องเรียนเรียบร้อยแล้ว เวลา ${new Date(
                actionTime,
              ).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
              })} น.`,
            },
          ]);
          break;
        }

        case 'checkout': {
          const booking = await this.bookingService.findById(bookingId);

          if (!booking) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'ไม่พบข้อมูลการจองนี้ครับ' },
            ]);
            break;
          }

          if (booking.lineId !== lineUserId) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'คุณไม่มีสิทธิ์ออกจากห้องเรียนนี้ครับ' },
            ]);
            break;
          }

          if (booking.userId === null) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'ไม่พบข้อมูลผู้จองสำหรับรายการนี้ครับ' },
            ]);
            break;
          }

          if (!booking.checkInTime) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'กรุณากด “เข้าห้องเรียน” ก่อนครับ' },
            ]);
            break;
          }

          if (booking.checkOutTime) {
            await this.lineService.replyMessage(event.replyToken, [
              {
                type: 'text',
                text: `คุณออกจากห้องเรียนแล้ว เวลา ${new Date(
                  booking.checkOutTime,
                ).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} น.`,
              },
            ]);
            break;
          }

          const actionTime = new Date().toISOString();

          await this.bookingService.checkOut(
            booking.id,
            booking.userId,
            false,
            actionTime,
          );

          await this.lineService.replyMessage(event.replyToken, [
            {
              type: 'text',
              text: `ออกจากห้องเรียนเรียบร้อยแล้ว เวลา ${new Date(
                actionTime,
              ).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
              })} น.`,
            },
          ]);
          break;
        }

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

        case 'cancel_confirm': {
          const booking = await this.bookingService.findById(bookingId);

          if (!booking) {
            await this.lineService.replyMessage(event.replyToken, [
              { type: 'text', text: 'ไม่พบข้อมูลการจองนี้ครับ' },
            ]);
            break;
          }

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
            {
              type: 'text',
              text: `ยกเลิกการจองรหัส #${bookingId} เรียบร้อยแล้วครับ`,
            },
          ]);
          break;
        }

        case 'cancel_abort': {
          await this.lineService.replyMessage(event.replyToken, [
            {
              type: 'text',
              text: 'ยกเลิกคำสั่ง ไม่มีการเปลี่ยนแปลงการจองครับ',
            },
          ]);
          break;
        }
      }
    }

    return { status: 'ok' };
  }
}