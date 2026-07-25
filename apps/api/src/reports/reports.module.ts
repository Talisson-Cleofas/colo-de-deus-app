import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({ imports: [GoogleModule], controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
