import { Module } from '@nestjs/common';
import { MissionaryAgendaController } from './missionary-agenda.controller';
import { MissionaryAgendaService } from './missionary-agenda.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [MissionaryAgendaController],
  providers: [MissionaryAgendaService],
  exports: [MissionaryAgendaService],
})
export class MissionaryAgendaModule {}
