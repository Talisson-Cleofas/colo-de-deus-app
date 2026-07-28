import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { GeocodingService } from './geocoding.service';
import { GoogleMapsController } from './google-maps.controller';
import { GoogleMapsService } from './google-maps.service';
import { LocationValidationService } from './location-validation.service';
import { MapsSyncService } from './maps-sync.service';

@Module({
  imports: [GoogleModule],
  controllers: [GoogleMapsController],
  providers: [GoogleMapsService, GeocodingService, LocationValidationService, MapsSyncService],
  exports: [GoogleMapsService, GeocodingService, LocationValidationService, MapsSyncService],
})
export class GoogleMapsModule {}
