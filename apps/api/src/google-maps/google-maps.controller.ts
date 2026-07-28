import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { GeocodeAddressDto } from './dto/geocode-address.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { GeocodingService } from './geocoding.service';
import { GoogleMapsService } from './google-maps.service';
import { MapsSyncService } from './maps-sync.service';

@ApiTags('Google Maps')
@Controller(['maps', 'google-maps'])
export class GoogleMapsController {
  constructor(
    private readonly maps: GoogleMapsService,
    private readonly geocoding: GeocodingService,
    private readonly sync: MapsSyncService,
  ) {}

  @Get('status')
  async status() {
    return { ...this.maps.status(), ...(await this.sync.stats()) };
  }

  @Post('rebuild')
  @Roles('ADMIN', 'MISSION_LEADER', 'DEVELOPER')
  rebuild() { return this.sync.rebuild(); }

  @Post('geocode') geocode(@Body() dto: GeocodeAddressDto) { return this.geocoding.geocode(dto.address); }
  @Post('reverse-geocode') reverse(@Body() dto: ReverseGeocodeDto) { return this.geocoding.reverse(dto.latitude, dto.longitude); }
  @Get('places') places(@Query('q') q = '') { return this.geocoding.places(q); }
  @Get('members') members() { return this.sync.list(); }
  @Get('cells') cells() { return this.maps.cells(); }
  @Get('cenacles') cenacles() { return this.maps.cenacles(); }
  @Get('events') events() { return this.maps.events(); }
}
