import { Injectable } from '@nestjs/common';
import { CnbbLectioProvider, type CnbbParsedLectio } from './cnbb-lectio.provider';
import { CancaoNovaLectioProvider, type CancaoNovaParsedLectio } from './cancao-nova-lectio.provider';
import type { LectioSettings, LectioSource } from './lectio.types';

export type ProviderParsedLectio = CnbbParsedLectio | CancaoNovaParsedLectio;
export type ProviderAttempt = {
  source: LectioSource;
  priority: number;
  status: 'SUCESSO' | 'ERRO' | 'DESATIVADA';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fromCache: boolean;
  error: string;
};

export type ProviderManagerResult = {
  parsed: ProviderParsedLectio | null;
  usedSource: LectioSource | null;
  primarySource: LectioSource;
  fallbackUsed: boolean;
  attempts: ProviderAttempt[];
};

@Injectable()
export class LectioProviderManager {
  constructor(
    private readonly cnbb: CnbbLectioProvider,
    private readonly cancaoNova: CancaoNovaLectioProvider,
  ) {}

  private enabled(source: LectioSource, settings: LectioSettings): boolean {
    return source === 'CNBB' ? settings.cnbbEnabled : settings.cancaoNovaEnabled;
  }

  private async fetch(source: LectioSource, date: string, force: boolean) {
    return source === 'CNBB' ? this.cnbb.fetchWithMetadata(date, force) : this.cancaoNova.fetchWithMetadata(date, force);
  }

  async execute(date: string, settings: LectioSettings, force = false): Promise<ProviderManagerResult> {
    const ordered = [settings.primarySource, settings.fallbackSource]
      .filter((source, index, all) => all.indexOf(source) === index);
    const attempts: ProviderAttempt[] = [];

    for (let index = 0; index < ordered.length; index += 1) {
      const source = ordered[index];
      const startedAt = new Date().toISOString();
      const started = Date.now();
      if (!this.enabled(source, settings)) {
        attempts.push({ source, priority: index + 1, status: 'DESATIVADA', startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - started, fromCache: false, error: 'Fonte desativada nas integrações.' });
        continue;
      }
      try {
        const response = await this.fetch(source, date, force);
        attempts.push({ source, priority: index + 1, status: 'SUCESSO', startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - started, fromCache: response.fromCache, error: '' });
        return { parsed: response.value, usedSource: source, primarySource: settings.primarySource, fallbackUsed: source !== settings.primarySource, attempts };
      } catch (error) {
        attempts.push({ source, priority: index + 1, status: 'ERRO', startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - started, fromCache: false, error: error instanceof Error ? error.message : 'Erro desconhecido.' });
      }
    }

    return { parsed: null, usedSource: null, primarySource: settings.primarySource, fallbackUsed: false, attempts };
  }
}
