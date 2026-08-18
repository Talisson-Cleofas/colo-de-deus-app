import { Module } from '@nestjs/common';
import { MissionaryAgendaController } from './missionary-agenda.controller';
import { MissionaryAgendaService } from './missionary-agenda.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [MissionaryAgendaController],
  providers: [MissionaryAgendaService],
  exports: [MissionaryAgendaService],
})
export class MissionaryAgendaModule {}
