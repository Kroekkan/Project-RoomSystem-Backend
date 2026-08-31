import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt'
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    
    if (existingUser) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        branch: createUserDto.branch,
        role: createUserDto.role,
      },
    });

    return { id: user.id, name: user.name, email: user.email, branch: user.branch, role: user.role };

  }

  async login(loginUserDto: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginUserDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.password) {
      throw new UnauthorizedException('บัญชีนี้สมัครผ่าน Google กรุณาเข้าสู่ระบบด้วย Google');
    }

    const isPasswordVaild = await bcrypt.compare(loginUserDto.password, user.password);
    if (!isPasswordVaild) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const token = this.jwtService.sign({ userId: user.id, email: user.email, role: user.role })

    return { token, role: user.role };

  }

  async getProfileFromToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { 
          id: true,
          name: true,
          email: true,
          branch: true,
          role: true,
          picture: true,
          themeSettings: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('ไม่พบผู้ใช้งาน')
      }

      return user;

    } catch (error) {
      throw new UnauthorizedException('Token ไม่ถูกต้องหรือหมดอายุ')
    }
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: number) {
    return this.prisma.user.delete({where: { id }})
  }

  async findOrCreateGoogleUser(googleUser: { email: string; name: string; picture?: string }) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (user) {
      if (user.provider === 'local') {
          user = await this.prisma.user.update({
          where: { email: googleUser.email },
          data: {
             picture: googleUser.picture ?? user.picture,
          },
        });
      }
      return user;
    }

    return this.prisma.user.create({
      data: {
         email: googleUser.email,
         name: googleUser.name,
         picture: googleUser.picture,
         branch: 'กรุณาใส่สาขา',
         role: 'USER',
         provider: 'google',
         password: null,
      }
    })
  }

  async updateUser(
    id: number,
    data: { name?: string; email?: string; branch?: string; role?: string },
  ) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          branch: data.branch,
          role: data.role ? (data.role as Role) : undefined, 
        },
      });
    } catch (error) {
      throw new NotFoundException(`ไม่พบผู้ใช้งาน ID: ${id}`);
    }
  }

  async findById(userId: number) {
  return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async updateTheme(userId: number, themeSettings: Record<string, string> | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { themeSettings: themeSettings ?? Prisma.JsonNull },
      select: { id: true, themeSettings: true },
    });
  }

}