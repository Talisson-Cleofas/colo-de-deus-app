import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LectioEntry } from './lectio.types';
import { SemanticLectioParser } from './semantic-lectio.parser';

export type CancaoNovaParsedLectio = Omit<LectioEntry, 'id' | 'status' | 'protected' | 'syncedAt' | 'updatedAt' | 'active' | 'reflection' | 'prayer'>;

@Injectable()
export class CancaoNovaLectioProvider {
  private readonly cache = new Map<string, { expiresAt: number; value: CancaoNovaParsedLectio }>();
  constructor(private readonly config: ConfigService, private readonly parser: SemanticLectioParser) {}

  parse(html: string, date: string): CancaoNovaParsedLectio { return this.parser.parse(html, date, 'CANCAO_NOVA'); }

  private buildUrl(baseUrl: string, date: string): string {
    const [year, month, day] = date.split('-');
    const url = new URL(baseUrl);
    // O calendário atual da Canção Nova usa estes parâmetros. Mantemos "data"
    // também para compatibilidade com instalações antigas.
    url.searchParams.set('data', date);
    if (year && month && day) {
      url.searchParams.set('sAno', year);
      url.searchParams.set('sMes', month);
      url.searchParams.set('sDia', day);
    }
    return url.toString();
  }

  async fetchWithMetadata(date: string, force = false): Promise<{ value: CancaoNovaParsedLectio; fromCache: boolean }> {
    const ttlMs = Math.max(60_000, Number(this.config.get<string>('LECTIO_PROVIDER_CACHE_TTL_MS', '900000')) || 900000);
    const cached = this.cache.get(date);
    if (!force && cached && cached.expiresAt > Date.now()) return { value: cached.value, fromCache: true };
    const baseUrl = this.config.get<string>('LECTIO_CANCAO_NOVA_URL', 'https://liturgia.cancaonova.com/pb/');
    const url = this.buildUrl(baseUrl, date);
    const timeoutMs = Math.max(3000, Number(this.config.get<string>('LECTIO_PROVIDER_TIMEOUT_MS', '20000')) || 20000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; ColoDeDeus/4.5.13; +LectioSync)',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'pt-BR,pt;q=0.9',
          'cache-control': 'no-cache',
        },
      });
      if (!response.ok) throw new ServiceUnavailableException(`Canção Nova respondeu HTTP ${response.status}.`);
      const parsed = this.parse(await response.text(), date);
      this.cache.set(date, { expiresAt: Date.now() + ttlMs, value: parsed });
      return { value: parsed, fromCache: false };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(`Falha ao consultar a Canção Nova: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async fetch(date: string, force = false): Promise<CancaoNovaParsedLectio> { return (await this.fetchWithMetadata(date, force)).value; }
  clearCache(date?: string): void { if (date) this.cache.delete(date); else this.cache.clear(); }
}
