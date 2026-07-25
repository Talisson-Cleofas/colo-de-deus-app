import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { BirthdaysController } from './birthdays.controller';
import { BirthdaysService } from './birthdays.service';

@Module({ imports: [GoogleModule, SettingsModule, NotificationsModule], controllers: [BirthdaysController], providers: [BirthdaysService], exports: [BirthdaysService] })
export class BirthdaysModule {}
