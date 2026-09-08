import { Module } from '@nestjs/common';
import { CenacleMissionsController } from './cenacle-missions.controller';
import { CenacleMissionsService } from './cenacle-missions.service';

@Module({ controllers: [CenacleMissionsController], providers: [CenacleMissionsService] })
export class CenacleMissionsModule {}
