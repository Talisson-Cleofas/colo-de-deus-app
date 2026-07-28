import { Injectable } from '@nestjs/common';
@Injectable()
export class LocationValidationService {
  coordinates(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } | null {
    const lat = Number(latitude); const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return null;
    return { latitude: lat, longitude: lng };
  }
  normalizeAddress(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
  }
  navigationUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }
  navigationUrlByAddress(address: string): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(this.normalizeAddress(address))}`;
  }
}
