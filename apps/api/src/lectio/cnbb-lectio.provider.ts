import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LectioEntry } from './lectio.types';
import { SemanticLectioParser } from './semantic-lectio.parser';

export type CnbbParsedLectio = Omit<LectioEntry, 'id' | 'status' | 'protected' | 'syncedAt' | 'updatedAt' | 'active' | 'reflection' | 'prayer'>;

type CnbbOfficialApiResponse = {
  content?: {
    date?: string;
    title?: string;
    color?: string;
    details?: string;
    leituras?: string;
    body?: string;
  };
  error?: string;
};

@Injectable()
export class CnbbLectioProvider {
  private readonly cache = new Map<string, { expiresAt: number; value: CnbbParsedLectio }>();
  constructor(private readonly config: ConfigService, private readonly parser: SemanticLectioParser) {}

  parse(html: string, date: string): CnbbParsedLectio { return this.parser.parse(html, date, 'CNBB'); }

  private async requestOfficialApi(date: string, timeoutMs: number): Promise<CnbbParsedLectio> {
    const baseUrl = this.config.get<string>(
      'LECTIO_CNBB_API_URL',
      'https://api-liturgia.edicoescnbb.com.br/contents/in/date/',
    );
    const publicSite = this.config.get<string>(
      'LECTIO_CNBB_PUBLIC_SITE_URL',
      'https://liturgiadiaria.edicoescnbb.com.br/',
    );
    const url = new URL(encodeURIComponent(date), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; ColoDeDeus/7.2.2; +LectioSync)',
          accept: 'application/json',
          origin: new URL(publicSite).origin,
          referer: publicSite,
          'cache-control': 'no-cache',
        },
      });
      if (!response.ok) throw new ServiceUnavailableException(`API da CNBB respondeu HTTP ${response.status}.`);
      const payload = await response.json() as CnbbOfficialApiResponse;
      const content = payload.content;
      if (payload.error || !content?.body) {
        throw new ServiceUnavailableException(payload.error || 'API da CNBB não retornou o corpo da liturgia.');
      }
      if (content.date && content.date !== date) {
        throw new ServiceUnavailableException(`API da CNBB retornou a data ${content.date} em vez de ${date}.`);
      }
      const parsed = this.parse(`${content.details || ''}\n${content.body}`, date);
      const listedReferences = this.parser.normalizeHtml(content.leituras || content.details || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length <= 100 && /^(?:Sl\s*|[1-3]?[A-ZÁÉÍÓÚ][A-Za-zÀ-ÿ]{0,15}\s*)\d/.test(line));
      const psalmIndex = listedReferences.findIndex((reference) => /^Sl\s*\d/i.test(reference));
      const firstReadingReference = psalmIndex > 0 ? listedReferences[0] : parsed.firstReadingReference;
      const psalmReference = psalmIndex >= 0 ? listedReferences[psalmIndex] : parsed.psalmReference;
      const referencesAfterPsalm = psalmIndex >= 0 ? listedReferences.slice(psalmIndex + 1) : [];
      const gospelReference = referencesAfterPsalm.at(-1) || parsed.gospelReference;
      const secondReadingReference = referencesAfterPsalm.length > 1
        ? referencesAfterPsalm[0]
        : parsed.secondReadingReference;
      return {
        ...parsed,
        firstReadingReference,
        psalmReference,
        secondReadingReference,
        gospelReference,
        liturgicalTime: content.title?.trim() || parsed.liturgicalTime,
        liturgicalColor: content.color?.trim() || parsed.liturgicalColor,
      };
    } finally {
      clearTimeout(timer);
    }
  }

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

    try {
      const parsed = await this.requestOfficialApi(date, timeoutMs);
      this.cache.set(date, { expiresAt: Date.now() + ttlMs, value: parsed });
      return { value: parsed, fromCache: false };
    } catch (error) {
      errors.push(`API oficial: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

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
