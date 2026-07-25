import { Module } from '@nestjs/common';
import { BirthdaysModule } from '../birthdays/birthdays.module';
import { EventsModule } from '../events/events.module';
import { LectioModule } from '../lectio/lectio.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MemberDashboardController } from './member-dashboard.controller';
import { MemberDashboardService } from './member-dashboard.service';

@Module({
  imports: [LectioModule, NotificationsModule, BirthdaysModule, EventsModule],
  controllers: [MemberDashboardController],
  providers: [MemberDashboardService],
})
export class MemberDashboardModule {}
