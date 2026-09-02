import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LineAuthService } from './line-auth.service';

@Controller('auth/line')
export class LineAuthController {
  private readonly frontendUrl = process.env.FRONTEND_URL;

  constructor(private readonly lineAuthService: LineAuthService) {}

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
      
      return res.redirect(
        `${this.frontendUrl}/Roombooking?lineUserId=${lineUser.userId}`
      );
    } catch {
      return res.redirect(`${this.frontendUrl}/Roombooking?error=auth_failed`);
    }
  }
}