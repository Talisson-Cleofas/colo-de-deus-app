import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({ imports: [GoogleModule, NotificationsModule], controllers: [EvaluationsController], providers: [EvaluationsService] })
export class EvaluationsModule {}
