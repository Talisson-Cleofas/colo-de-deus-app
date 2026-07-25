import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LectioEntry } from './lectio.types';
import { SemanticLectioParser } from './semantic-lectio.parser';

export type CnbbParsedLectio = Omit<LectioEntry, 'id' | 'status' | 'protected' | 'syncedAt' | 'updatedAt' | 'active' | 'reflection' | 'prayer'>;

@Injectable()
export class CnbbLectioProvider {
  private readonly cache = new Map<string, { expiresAt: number; value: CnbbParsedLectio }>();
  constructor(private readonly config: ConfigService, private readonly parser: SemanticLectioParser) {}

  parse(html: string, date: string): CnbbParsedLectio { return this.parser.parse(html, date, 'CNBB'); }

  private async requestHtml(url: string, timeoutMs: number): Promise<string> {
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
      if (!response.ok) throw new ServiceUnavailableException(`CNBB respondeu HTTP ${response.status}.`);
      return response.text();
    } finally {
      clearTimeout(timer);
    }
  }

  async fetchWithMetadata(date: string, force = false): Promise<{ value: CnbbParsedLectio; fromCache: boolean }> {
    const ttlMs = Math.max(60_000, Number(this.config.get<string>('LECTIO_PROVIDER_CACHE_TTL_MS', '900000')) || 900000);
    const cached = this.cache.get(date);
    if (!force && cached && cached.expiresAt > Date.now()) return { value: cached.value, fromCache: true };

    const primaryUrl = this.config.get<string>('LECTIO_CNBB_URL', 'https://www.cnbb.org.br/liturgia-diaria/');
    // A página nacional pode entregar apenas o shell do WordPress para requisições de servidor.
    // Neste caso usamos um espelho regional oficial da própria CNBB, com o mesmo conteúdo litúrgico.
    const mirrorUrl = this.config.get<string>('LECTIO_CNBB_MIRROR_URL', 'https://cnbbsul3.org.br/liturgia-diaria/');
    const timeoutMs = Math.max(3000, Number(this.config.get<string>('LECTIO_PROVIDER_TIMEOUT_MS', '20000')) || 20000);
    const errors: string[] = [];

    for (const url of [...new Set([primaryUrl, mirrorUrl].filter(Boolean))]) {
      try {
        const html = await this.requestHtml(url, timeoutMs);
        const parsed = this.parse(html, date);
        this.cache.set(date, { expiresAt: Date.now() + ttlMs, value: parsed });
        return { value: parsed, fromCache: false };
      } catch (error) {
        errors.push(`${url}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
      }
    }

    throw new ServiceUnavailableException(`Falha ao consultar a CNBB. ${errors.join(' | ')}`);
  }

  async fetch(date: string, force = false): Promise<CnbbParsedLectio> { return (await this.fetchWithMetadata(date, force)).value; }
  clearCache(date?: string): void { if (date) this.cache.delete(date); else this.cache.clear(); }
}
