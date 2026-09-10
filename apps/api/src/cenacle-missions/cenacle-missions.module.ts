import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CenacleMissionsController } from './cenacle-missions.controller';
import { CenacleMissionsService } from './cenacle-missions.service';

@Module({ imports: [NotificationsModule], controllers: [CenacleMissionsController], providers: [CenacleMissionsService] })
export class CenacleMissionsModule {}
