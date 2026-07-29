import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: 'my-secret-key-change-this-later',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [UsersService, PrismaService, JwtStrategy],
  controllers: [UsersController],
  exports: [JwtModule],
})
export class UsersModule {}
