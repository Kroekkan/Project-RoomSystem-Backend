import { Controller, Get, Post, Body, Res, Req, UnauthorizedException, Param, Delete } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, role } = await this.usersService.login(loginUserDto);

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    
    return {
      message: "Login success",
      role,
    };
    
  }

  @Get('me')
  getProfile(@Req() req: Request) {
    const token = req.cookies?.['access_token'];

    if (!token) {
      throw new UnauthorizedException('ยังไม่ได้เข้าสู่ระบบ');
    }

    return this.usersService.getProfileFromToken(token);

  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return { message: 'ออกจากระบบสำเร็จ' };

  }

  @Get('checkuser')
  getAllUser() {
    return this.usersService.findAll();
  }

  @Delete(':id')
  DeleteId(@Param('id') id: string) {
    return this.usersService.findOne(Number(id))
  }

}
