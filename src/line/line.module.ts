import { Module, forwardRef } from '@nestjs/common';
import { LineService } from './line.service';
import { LineWebhookController } from './line-webhook.controller';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [forwardRef(() => BookingsModule)],
  providers: [LineService],
  controllers: [LineWebhookController],
  exports: [LineService],
})
export class LineModule {}