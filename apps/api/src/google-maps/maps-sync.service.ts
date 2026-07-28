import { Injectable, Logger } from '@nestjs/common';
import { GoogleSheetsService, type SheetRecord } from '../google/google-sheets.service';
import { GeocodingService } from './geocoding.service';
import { LocationValidationService } from './location-validation.service';

export type MemberMapRecord = {
  id: string;
  name: string;
  photo: string;
  phone: string;
  ministry: string;
  cell: string;
  city: string;
  state: string;
  address: string;
  neighborhood: string;
  zipCode: string;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  mapsLastUpdate: string;
  geocodeStatus: string;
  geocodeProvider: string;
};

export type MapsSyncStats = {
  totalMembers: number;
  geocoded: number;
  pending: number;
  errors: number;
  cacheHits: number;
  cacheMisses: number;
};

@Injectable()
export class MapsSyncService {
  private readonly logger = new Logger(MapsSyncService.name);
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  constructor(
    private readonly sheets: GoogleSheetsService,
    private readonly geocoding: GeocodingService,
    private readonly validator: LocationValidationService,
  ) {}

  private active(row: SheetRecord): boolean {
    return this.sheets.parseActive(row.ativo || row.active || '') && !String(row.deleted_at || row.deletedAt || '').trim();
  }

  private address(row: SheetRecord): string {
    return this.validator.normalizeAddress([
      row.endereco || row.address,
      row.bairro || row.neighborhood,
      row.cidade || row.city,
      row.estado || row.state,
      row.cep || row.zipCode,
    ].filter(Boolean).join(', '));
  }

  private fresh(row: SheetRecord): boolean {
    const updated = new Date(row.maps_last_update || row.localizacao_atualizada_em || 0).getTime();
    return Boolean(updated) && Date.now() - updated < this.ttlMs;
  }

  private validCoordinates(row: SheetRecord) {
    return this.validator.coordinates(row.latitude, row.longitude);
  }

  private toRecord(row: SheetRecord): MemberMapRecord {
    const coordinates = this.validCoordinates(row);
    const address = this.address(row);
    const formattedAddress = row.formatted_address || row.endereco_formatado || address;
    const googleMapsUrl = coordinates
      ? this.validator.navigationUrl(coordinates.latitude, coordinates.longitude)
      : address
        ? this.validator.navigationUrlByAddress(address)
        : null;
    return {
      id: row.id,
      name: row.nome || row.name || 'Membro',
      photo: row.foto || row.photo || '',
      phone: row.telefone || row.phone || '',
      ministry: row.ministerio || row.ministry || '',
      cell: row.celula || row.cell || '',
      city: row.cidade || row.city || '',
      state: row.estado || row.state || '',
      address: row.endereco || row.address || '',
      neighborhood: row.bairro || row.neighborhood || '',
      zipCode: row.cep || row.zipCode || '',
      formattedAddress,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      googleMapsUrl,
      mapsLastUpdate: row.maps_last_update || row.localizacao_atualizada_em || '',
      geocodeStatus: row.geocode_status || (coordinates ? 'GEOCODED' : address ? 'PENDING' : 'NO_ADDRESS'),
      geocodeProvider: row.geocode_provider || (coordinates ? 'GOOGLE' : ''),
    };
  }

  private async persist(row: SheetRecord, result: Awaited<ReturnType<GeocodingService['geocode']>>) {
    const now = new Date().toISOString();
    await this.sheets.updateRecord('Membros', 'id', row.id, {
      ...row,
      latitude: String(result.latitude),
      longitude: String(result.longitude),
      google_place_id: result.placeId,
      formatted_address: result.formattedAddress,
      maps_last_update: now,
      geocode_status: 'GEOCODED',
      geocode_provider: 'GOOGLE',
      atualizado_em: now,
    });
  }

  async syncRow(row: SheetRecord, force = false): Promise<MemberMapRecord> {
    const address = this.address(row);
    const coordinates = this.validCoordinates(row);
    if (!address) return this.toRecord({ ...row, geocode_status: 'NO_ADDRESS' });
    if (!force && coordinates && this.fresh(row)) {
      this.cacheHits += 1;
      return this.toRecord(row);
    }
    this.cacheMisses += 1;
    try {
      const result = await this.geocoding.geocode(address);
      await this.persist(row, result);
      return this.toRecord({
        ...row,
        latitude: String(result.latitude),
        longitude: String(result.longitude),
        formatted_address: result.formattedAddress,
        maps_last_update: new Date().toISOString(),
        geocode_status: 'GEOCODED',
        geocode_provider: 'GOOGLE',
      });
    } catch (error) {
      const now = new Date().toISOString();
      this.logger.warn(`Falha ao geocodificar o membro ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      await this.sheets.updateRecord('Membros', 'id', row.id, {
        ...row,
        geocode_status: 'ERROR',
        maps_last_update: now,
        atualizado_em: now,
      });
      return this.toRecord({ ...row, geocode_status: 'ERROR', maps_last_update: now });
    }
  }

  async syncMember(memberId: string, force = true): Promise<MemberMapRecord | null> {
    const row = (await this.sheets.read('Membros')).find((item) => item.id === memberId && this.active(item));
    return row ? this.syncRow(row, force) : null;
  }

  async list(syncMissing = true): Promise<MemberMapRecord[]> {
    const rows = (await this.sheets.read('Membros')).filter((row) => this.active(row));
    const unique = [...new Map(rows.filter((row) => row.id).map((row) => [row.id, row])).values()];
    const records: MemberMapRecord[] = [];
    for (const row of unique) {
      const needsSync = Boolean(this.address(row)) && (!this.validCoordinates(row) || !this.fresh(row));
      records.push(syncMissing && needsSync ? await this.syncRow(row) : this.toRecord(row));
    }
    return records.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async rebuild() {
    const members = await this.list(false);
    const targets = members.filter((item) => item.formattedAddress && (!item.latitude || !item.longitude || item.geocodeStatus !== 'GEOCODED' || !item.mapsLastUpdate || Date.now() - new Date(item.mapsLastUpdate).getTime() >= this.ttlMs));
    const updated: MemberMapRecord[] = [];
    for (const target of targets) {
      const record = await this.syncMember(target.id, true);
      if (record) updated.push(record);
    }
    return { status: 'SUCCESS', processed: targets.length, updated };
  }

  async stats(): Promise<MapsSyncStats> {
    const members = await this.list(false);
    return {
      totalMembers: members.length,
      geocoded: members.filter((item) => item.latitude !== null && item.longitude !== null).length,
      pending: members.filter((item) => item.geocodeStatus === 'PENDING' || item.geocodeStatus === 'NO_ADDRESS').length,
      errors: members.filter((item) => item.geocodeStatus === 'ERROR').length,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
    };
  }
}
