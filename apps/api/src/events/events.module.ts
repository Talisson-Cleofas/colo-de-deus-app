import { Module } from '@nestjs/common';
import { GoogleMapsModule } from '../google-maps/google-maps.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({ imports:[GoogleMapsModule,GoogleDriveModule], controllers: [EventsController], providers: [EventsService], exports: [EventsService] })
export class EventsModule {}
