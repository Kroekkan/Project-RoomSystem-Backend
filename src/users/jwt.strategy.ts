import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(), // 🟢 อ่านจาก Authorization: Bearer ก่อน
                (req: Request) => {
                    return req?.cookies?.['access_token'] || null; // fallback เผื่อมี cookie
                },
            ]),
            secretOrKey: process.env.JWT_SECRET || 'MySuperSecretKey_123456789',
        });
    }

    async validate(payload: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            throw new UnauthorizedException('ไม่พบผู้ใช้งานนี้ในระบบ');
        }

        return { userId: user.id, email: user.email, role: user.role };
    }
}