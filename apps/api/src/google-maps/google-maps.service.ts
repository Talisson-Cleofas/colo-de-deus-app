import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleSheetsService, type SheetRecord } from '../google/google-sheets.service';
import { GeocodingService } from './geocoding.service';
import { LocationValidationService } from './location-validation.service';
import type { MapMarkerDto, MapsStatus } from './google-maps.types';

@Injectable()
export class GoogleMapsService {
  constructor(
    private readonly config: ConfigService,
    private readonly sheets: GoogleSheetsService,
    private readonly validator: LocationValidationService,
    private readonly geocoding: GeocodingService,
  ) {}

  status(): MapsStatus {
    const enabled = this.config.get<string>('GOOGLE_MAPS_ENABLED', 'false') === 'true';
    const configured = Boolean(this.config.get<string>('GOOGLE_MAPS_SERVER_API_KEY')?.trim());
    return { enabled, configured, message: enabled && configured ? 'Google Maps pronto para uso.' : 'Google Maps ainda não configurado.' };
  }

  private marker(row: SheetRecord, category: MapMarkerDto['category'], titleKeys: string[]): MapMarkerDto | null {
    const coordinates = this.validator.coordinates(row.latitude, row.longitude);
    if (!coordinates) return null;
    const title = titleKeys.map((key) => row[key]).find(Boolean) || 'Localização';
    const address = [row.endereco, row.bairro, row.cidade, row.estado, row.cep].filter(Boolean).join(', ');
    return {
      id: row.id || `${category}-${coordinates.latitude}-${coordinates.longitude}`,
      title,
      description: row.descricao || row.mensagem || '',
      address,
      category,
      ...coordinates,
      navigationUrl: this.validator.navigationUrl(coordinates.latitude, coordinates.longitude),
      metadata: { status: row.status || '', date: row.data || '', time: row.horario || '' },
    };
  }

  private async from(tab: string, category: MapMarkerDto['category'], titleKeys: string[]) {
    if (!this.status().enabled || !this.status().configured) return [];
    const rows = await this.sheets.read(tab);
    return rows.map((row) => this.marker(row, category, titleKeys)).filter((value): value is MapMarkerDto => Boolean(value));
  }

  async members(): Promise<MapMarkerDto[]> {
    if (!this.status().enabled || !this.status().configured) return [];
    const rows = (await this.sheets.read('Membros')).filter((row) => this.sheets.parseActive(row.ativo || '') && !(row.deleted_at || ''));
    const markers: MapMarkerDto[] = [];

    for (const row of rows) {
      let marker = this.marker(row, 'MEMBER', ['nome', 'name']);
      const fullAddress = [row.endereco, row.bairro, row.cidade, row.estado, row.cep].filter(Boolean).join(', ');
      if (!marker && fullAddress) {
        try {
          const location = await this.geocoding.geocode(fullAddress);
          const now = new Date().toISOString();
          await this.sheets.updateRecord('Membros', 'id', row.id, {
            ...row,
            endereco: row.endereco || location.formattedAddress,
            latitude: String(location.latitude),
            longitude: String(location.longitude),
            google_place_id: location.placeId,
            localizacao_atualizada_em: now,
            atualizado_em: now,
          });
          marker = this.marker({ ...row, endereco: row.endereco || location.formattedAddress, latitude: String(location.latitude), longitude: String(location.longitude) }, 'MEMBER', ['nome', 'name']);
        } catch {
          marker = null;
        }
      }
      if (marker) markers.push(marker);
    }
    return markers;
  }

  cells() { return this.from('Células', 'CELL', ['nome']); }
  cenacles() { return this.from('Cenáculos', 'CENACLE', ['nome']); }
  events() { return this.from('Eventos', 'EVENT', ['titulo', 'nome']); }
}
