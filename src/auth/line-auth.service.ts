import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class LineAuthService {
  // 🟢 ใส่ ?? '' ป้องกันค่าเป็น undefined แก้ ts(2345)
  private readonly clientId = process.env.LINE_LOGIN_CHANNEL_ID ?? '';
  private readonly clientSecret = process.env.LINE_LOGIN_CHANNEL_SECRET ?? '';
  private readonly callbackUrl = process.env.LINE_LOGIN_CALLBACK_URL;

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
      // 🟢 ใช้ URLSearchParams.append ปลอดภัยต่อ Type Check 100%
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
    } catch (error: any) { // 🟢 ระบุ error: any แก้ ts(2339) และ ts(18046)
      if (axios.isAxiosError(error)) {
        console.error('Error exchanging LINE Login code:', error.response?.data || error.message);
      } else {
        console.error('Error exchanging LINE Login code:', error);
      }
      throw new BadRequestException('ไม่สามารถยืนยันตัวตนกับ LINE ได้');
    }
  }
}