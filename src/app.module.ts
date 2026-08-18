import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { RoomsModule } from './room/room.module';
import { BookingsModule } from './bookings/bookings.module';
import { LineModule } from './line/line.module';
import { LineAuthController } from './auth/line-auth.controller';
import { LineAuthService } from './auth/line-auth.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    RoomsModule,
    BookingsModule,
    LineModule,
  ],
  controllers: [AppController, LineAuthController],
  providers: [AppService, LineAuthService],
})
export class AppModule {}
