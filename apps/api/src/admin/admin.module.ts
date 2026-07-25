import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [GoogleModule],
  controllers: [AdminDashboardController, DashboardController],
  providers: [AdminDashboardService],
})
export class AdminModule {}
