import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.['access_token'] || null;
                },
            ]),
            secretOrKey: process.env.JWT_SECRET || 'MySuperSecretKey_123456789',
        });
    }

    async validate(payload: any ) {
        return { userId: payload.userId, email: payload.email };
    }
}