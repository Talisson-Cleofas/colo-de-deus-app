import { Injectable, Logger } from '@nestjs/common';

export type NotificationDateInput = string | number | Date | null | undefined;

@Injectable()
export class NotificationDateNormalizer {
  private readonly logger = new Logger(NotificationDateNormalizer.name);
  private readonly sheetEpoch = Date.UTC(1899, 11, 30);

  toIso(value: NotificationDateInput, context = 'data'): string | null {
    const parsed = this.parse(value);
    if (!parsed) {
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        this.logger.warn(`[NotificationNormalizer] ${context}: data inválida recebida: ${String(value)}`);
      }
      return null;
    }
    return parsed.toISOString();
  }

  timestamp(value: NotificationDateInput): number | null {
    return this.parse(value)?.getTime() ?? null;
  }

  normalizeFields<T extends Record<string, unknown>>(record: T, fields: string[]): T {
    const normalized: Record<string, unknown> = { ...record };
    for (const field of fields) normalized[field] = this.toIso(record[field] as NotificationDateInput, field);
    return normalized as T;
  }

  private parse(value: NotificationDateInput): Date | null {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    if (typeof value === 'number') return this.fromNumber(value);
    if (value === null || value === undefined) return null;

    const text = String(value).trim();
    if (!text) return null;
    if (/^-?\d+(?:[.,]\d+)?$/.test(text)) return this.fromNumber(Number(text.replace(',', '.')));

    const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):?(\d{2})?(?::?(\d{2}))?(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?)?$/i);
    if (isoDate) {
      const direct = new Date(text);
      if (!Number.isNaN(direct.getTime())) return direct;
      return this.fromParts(+isoDate[1], +isoDate[2], +isoDate[3], +(isoDate[4] || 0), +(isoDate[5] || 0), +(isoDate[6] || 0));
    }

    const br = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):?(\d{2})?(?::?(\d{2}))?)?$/);
    if (br) return this.fromParts(+br[3], +br[2], +br[1], +(br[4] || 0), +(br[5] || 0), +(br[6] || 0));

    const native = new Date(text);
    return Number.isNaN(native.getTime()) ? null : native;
  }

  private fromNumber(value: number): Date | null {
    if (!Number.isFinite(value)) return null;
    // Valores típicos de planilhas são números seriais; valores grandes podem ser timestamps.
    const milliseconds = value > 10_000_000_000 ? value : value > 1_000_000_000 ? value * 1000 : this.sheetEpoch + value * 86_400_000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private fromParts(year: number, month: number, day: number, hour: number, minute: number, second: number): Date | null {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }
}
