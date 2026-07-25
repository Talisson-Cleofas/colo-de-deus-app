import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleSheetsService, type SheetRecord } from '../google/google-sheets.service';
import { LocationValidationService } from './location-validation.service';
import type { MapMarkerDto, MapsStatus } from './google-maps.types';
@Injectable()
export class GoogleMapsService {
  constructor(private readonly config:ConfigService,private readonly sheets:GoogleSheetsService,private readonly validator:LocationValidationService){}
  status():MapsStatus{const enabled=this.config.get<string>('GOOGLE_MAPS_ENABLED','false')==='true';const configured=Boolean(this.config.get<string>('GOOGLE_MAPS_SERVER_API_KEY')?.trim());return {enabled,configured,message:enabled&&configured?'Google Maps pronto para uso.':'Google Maps ainda não configurado.'};}
  private marker(row:SheetRecord,category:MapMarkerDto['category'],titleKeys:string[]):MapMarkerDto|null{const c=this.validator.coordinates(row.latitude,row.longitude);if(!c)return null;const title=titleKeys.map(k=>row[k]).find(Boolean)||'Localização';const address=[row.endereco,row.bairro,row.cidade,row.estado].filter(Boolean).join(', ');return {id:row.id||`${category}-${c.latitude}-${c.longitude}`,title,description:row.descricao||row.mensagem||'',address,category,...c,navigationUrl:this.validator.navigationUrl(c.latitude,c.longitude),metadata:{status:row.status||'',date:row.data||'',time:row.horario||''}};}
  private async from(tab:string,category:MapMarkerDto['category'],titleKeys:string[]){if(!this.status().enabled||!this.status().configured)return [];const rows=await this.sheets.read(tab);return rows.map(r=>this.marker(r,category,titleKeys)).filter((v):v is MapMarkerDto=>Boolean(v));}
  members(){return this.from('Membros','MEMBER',['nome','name']);}
  cells(){return this.from('Células','CELL',['nome']);}
  cenacles(){return this.from('Cenáculos','CENACLE',['nome']);}
  events(){return this.from('Eventos','EVENT',['titulo','nome']);}
}
