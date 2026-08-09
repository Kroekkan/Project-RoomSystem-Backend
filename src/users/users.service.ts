import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt'
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
          role: true
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

}