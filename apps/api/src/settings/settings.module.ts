import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({ imports: [GoogleModule], controllers: [SettingsController], providers: [SettingsService], exports: [SettingsService] })
export class SettingsModule {}
