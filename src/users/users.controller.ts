import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Req,
  UnauthorizedException,
  Param,
  Delete,
  UseGuards,
  Patch,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('create')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, role } =
      await this.usersService.login(loginUserDto);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      message: 'Login success',
      token,
      role,
    };
  }

  @Get('me')
  getProfile(@Req() req: Request) {
    let token = req.cookies?.['access_token'];

    if (!token) {
      const authHeader = req.headers.authorization;

      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('ยังไม่ได้เข้าสู่ระบบ');
    }

    return this.usersService.getProfileFromToken(token);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    return {
      message: 'ออกจากระบบสำเร็จ',
    };
  }

  @Get('checkuser')
  getAllUser() {
    return this.usersService.findAll();
  }

  @Delete(':id')
  DeleteId(@Param('id') id: string) {
    return this.usersService.findOne(Number(id));
  }

  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      branch?: string;
      role?: string;
    },
  ) {
    return this.usersService.updateUser(Number(id), body);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const googleUser = req.user;

    const user =
      await this.usersService.findOrCreateGoogleUser(
        googleUser,
      );

    const token = this.jwtService.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.redirect(
      `${process.env.FRONT_URL}/`,
    );
  }

  @Patch('me/theme')
  @UseGuards(AuthGuard('jwt'))
  async updateTheme(
    @Req() req,
    @Body()
    body: {
      themeSettings: Record<string, string> | null;
    },
  ) {
    return this.usersService.updateTheme(
      req.user.userId,
      body.themeSettings,
    );
  }
}