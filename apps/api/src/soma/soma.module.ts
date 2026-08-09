import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MercadoPagoQueueService } from './mercado-pago-queue.service';
import { ReceiptService } from './receipt.service';
import { SomaController } from './soma.controller';
import { SomaService } from './soma.service';
@Module({
  imports: [NotificationsModule],
  controllers: [SomaController],
  providers: [SomaService, MercadoPagoQueueService, ReceiptService],
  exports: [SomaService],
})
export class SomaModule {}
