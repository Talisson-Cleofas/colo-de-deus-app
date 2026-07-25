import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { LocationValidationService } from './location-validation.service';

export type GeocodingResult = { formattedAddress:string; latitude:number; longitude:number; placeId:string; cached:boolean };

@Injectable()
export class GeocodingService {
  constructor(
    private readonly config: ConfigService,
    private readonly validator: LocationValidationService,
    private readonly sheets: GoogleSheetsService,
  ) {}

  private status() {
    const key=this.config.get<string>('GOOGLE_MAPS_SERVER_API_KEY')?.trim();
    const enabled=this.config.get<string>('GOOGLE_MAPS_ENABLED','false')==='true';
    const ttlDays=Number(this.config.get<string>('GOOGLE_MAPS_CACHE_TTL_DAYS','180')) || 180;
    return {key,enabled,ttlDays};
  }

  private cacheKey(address:string){return createHash('sha256').update(address).digest('hex');}

  private async cached(normalized:string):Promise<GeocodingResult|null>{
    if(this.sheets.isDemo()) return null;
    const rows=await this.sheets.read('GeocodingCache');
    const row=rows.find(item=>item.endereco_normalizado===normalized);
    if(!row) return null;
    const updated=new Date(row.atualizado_em||row.criado_em||0).getTime();
    const ttl=this.status().ttlDays*86400000;
    if(!updated || Date.now()-updated>ttl) return null;
    const latitude=Number(row.latitude),longitude=Number(row.longitude);
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)) return null;
    await this.sheets.updateRecord('GeocodingCache','id',row.id,{...row,consultas:Number(row.consultas||0)+1,atualizado_em:new Date().toISOString()});
    return {formattedAddress:row.endereco_formatado,latitude,longitude,placeId:row.google_place_id,cached:true};
  }

  private async saveCache(normalized:string,result:Omit<GeocodingResult,'cached'>){
    if(this.sheets.isDemo()) return;
    const rows=await this.sheets.read('GeocodingCache');
    const existing=rows.find(item=>item.endereco_normalizado===normalized);
    const now=new Date().toISOString();
    const payload={id:existing?.id||randomUUID(),endereco_normalizado:normalized,endereco_formatado:result.formattedAddress,latitude:result.latitude,longitude:result.longitude,google_place_id:result.placeId,consultas:Number(existing?.consultas||0)+1,criado_em:existing?.criado_em||now,atualizado_em:now};
    if(existing) await this.sheets.updateRecord('GeocodingCache','id',existing.id,payload);
    else await this.sheets.appendRecord('GeocodingCache',payload);
  }

  async geocode(address: string):Promise<GeocodingResult> {
    const normalized=this.validator.normalizeAddress(address);
    if(!normalized) throw new ServiceUnavailableException('Informe um endereço válido.');
    const hit=await this.cached(normalized); if(hit) return hit;
    const {key,enabled}=this.status(); if(!enabled||!key) throw new ServiceUnavailableException('Google Maps ainda não configurado.');
    const response=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(normalized)}&key=${encodeURIComponent(key)}`);
    const data=await response.json() as {status:string;results?:Array<{formatted_address:string;place_id:string;geometry:{location:{lat:number;lng:number}}}>;error_message?:string};
    const first=data.results?.[0]; if(!response.ok||data.status!=='OK'||!first) throw new ServiceUnavailableException(data.error_message||'Endereço não encontrado no Google Maps.');
    const result={formattedAddress:first.formatted_address,latitude:first.geometry.location.lat,longitude:first.geometry.location.lng,placeId:first.place_id};
    await this.saveCache(normalized,result); return {...result,cached:false};
  }

  async reverse(latitude:number,longitude:number){
    const coordinates=this.validator.coordinates(latitude,longitude); if(!coordinates) throw new ServiceUnavailableException('Coordenadas inválidas.');
    const {key,enabled}=this.status(); if(!enabled||!key) throw new ServiceUnavailableException('Google Maps ainda não configurado.');
    const response=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${encodeURIComponent(key)}`);
    const data=await response.json() as {status:string;results?:Array<{formatted_address:string;place_id:string}>;error_message?:string}; const first=data.results?.[0];
    if(!response.ok||data.status!=='OK'||!first) throw new ServiceUnavailableException(data.error_message||'Localização não encontrada.');
    return {formattedAddress:first.formatted_address,placeId:first.place_id,...coordinates};
  }

  async places(input:string){
    const {key,enabled}=this.status(); if(!enabled||!key) throw new ServiceUnavailableException('Google Places ainda não configurado.');
    if(input.trim().length<3) return [];
    const response=await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input.trim())}&language=pt-BR&components=country:br&key=${encodeURIComponent(key)}`);
    const data=await response.json() as {status:string;predictions?:Array<{description:string;place_id:string;structured_formatting?:{main_text:string;secondary_text:string}}>;error_message?:string};
    if(!response.ok||!['OK','ZERO_RESULTS'].includes(data.status)) throw new ServiceUnavailableException(data.error_message||'Não foi possível buscar endereços.');
    return (data.predictions||[]).map(item=>({description:item.description,placeId:item.place_id,mainText:item.structured_formatting?.main_text||'',secondaryText:item.structured_formatting?.secondary_text||''}));
  }
}
