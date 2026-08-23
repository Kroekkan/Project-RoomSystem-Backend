import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    PrismaModule,
  ],
  providers: [UsersService, PrismaService, JwtStrategy, GoogleStrategy],
  controllers: [UsersController],
  exports: [JwtModule],
})
export class UsersModule {}
