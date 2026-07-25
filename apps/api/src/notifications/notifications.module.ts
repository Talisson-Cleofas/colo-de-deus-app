import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsController } from './notifications.controller';
import { NotificationDateNormalizer } from './notification-date-normalizer.service';
import { NotificationsService } from './notifications.service';
import { NotificationReadEngine } from './notification-read-engine.service';
import { NotificationSheetValidator } from './notification-sheet-validator.service';
@Module({imports:[GoogleModule,SettingsModule],controllers:[NotificationsController],providers:[NotificationsService,NotificationDateNormalizer,NotificationReadEngine,NotificationSheetValidator],exports:[NotificationsService,NotificationDateNormalizer,NotificationReadEngine,NotificationSheetValidator]})
export class NotificationsModule {}
