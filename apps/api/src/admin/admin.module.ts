import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { SomaModule } from '../soma/soma.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [GoogleModule, SomaModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminModule {}
