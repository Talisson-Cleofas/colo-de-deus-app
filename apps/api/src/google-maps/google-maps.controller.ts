import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GeocodeAddressDto } from './dto/geocode-address.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { GeocodingService } from './geocoding.service';
import { GoogleMapsService } from './google-maps.service';
@ApiTags('Google Maps') @Controller('maps')
export class GoogleMapsController{
 constructor(private readonly maps:GoogleMapsService,private readonly geocoding:GeocodingService){}
 @Get('status') status(){return this.maps.status();}
 @Post('geocode') geocode(@Body() dto:GeocodeAddressDto){return this.geocoding.geocode(dto.address);}
 @Post('reverse-geocode') reverse(@Body() dto:ReverseGeocodeDto){return this.geocoding.reverse(dto.latitude,dto.longitude);}
 @Get('places') places(@Query('q') q=''){return this.geocoding.places(q);}
 @Get('members') members(){return this.maps.members();}
 @Get('cells') cells(){return this.maps.cells();}
 @Get('cenacles') cenacles(){return this.maps.cenacles();}
 @Get('events') events(){return this.maps.events();}
}
