import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LineAuthService } from './line-auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth/line')
export class LineAuthController {
  private readonly frontendUrl = process.env.FRONT_URL;

  constructor(
    private readonly lineAuthService: LineAuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  redirectToLine(@Res() res: Response) {
    const url = this.lineAuthService.getAuthorizationUrl();
    return res.redirect(url);
  }

  @Get('callback')
  async handleCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.redirect(`${this.frontendUrl}/Roombooking?error=no_code`);
    }

    try {
      const lineUser = await this.lineAuthService.getLineUserProfile(code);
      
      // 🟢 วิธีบันทึกลง DB: สมมติว่าต้องการอัปเดต lineId ให้กับ User 
      // (คุณสามารถเปลี่ยนเงื่อนไขการหาผู้ใช้ เช่น จากอีเมล หรือ sessionId ที่ส่งมาได้ครับ)
      /* 
      // ตัวอย่างเช่น ถ้าคุณทราบ email หรือ id ของผู้ใช้ที่กำลังล็อกอินอยู่:
      await this.prisma.user.update({
        where: { email: 'user@example.com' }, // เปลี่ยนเป็นเงื่อนไขที่ใช้หาตัวผู้ใช้จริง
        data: { lineId: lineUser.userId },
      });
      */

      // หรือถ้าต้องการเก็บแบบค้นหาจากชื่อ หรือสร้างเงื่อนไขผูกบัญชี สามารถระบุต่อได้เลยครับ
      console.log('LINE User ID ที่ได้:', lineUser.userId);

      return res.redirect(
        `${this.frontendUrl}/Roombooking?lineUserId=${lineUser.userId}`
      );
    } catch (error) {
      console.error('LINE Callback Error:', error);
      return res.redirect(`${this.frontendUrl}/Roombooking?error=auth_failed`);
    }
  }
}