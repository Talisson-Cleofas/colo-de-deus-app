import { Inject, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { SheetRecord } from '../google/google-sheets.service';
import { LECTIO_REPOSITORY, type ILectioRepository } from '../persistence/interfaces/lectio-repository.interface';
import { IntegrationConfigService } from '../integrations/integration-config.service';
import { CnbbLectioProvider } from './cnbb-lectio.provider';
import { CancaoNovaLectioProvider } from './cancao-nova-lectio.provider';
import { LectioProviderManager, type ProviderAttempt } from './lectio-provider-manager';
import { LectioMigrationService } from './lectio-migration.service';
import { UpdateLectioSettingsDto } from './dto/update-lectio-settings.dto';
import { UpsertLectioDto } from './dto/upsert-lectio.dto';
import type { LectioEntry, LectioSettings, LectioSource, LectioSyncLog, LectioSyncResult } from './lectio.types';
const LECTIO_SETTING_KEYS = {
  primarySource: 'LECTIO_PRIMARY_SOURCE',
  fallbackSource: 'LECTIO_FALLBACK_SOURCE',
  cnbbEnabled: 'LECTIO_CNBB_ENABLED',
  cancaoNovaEnabled: 'LECTIO_CANCAO_NOVA_ENABLED',
  retentionDays: 'LECTIO_RETENTION_DAYS',
  deleteOldRecords: 'LECTIO_DELETE_OLD_RECORDS',
} as const;
@Injectable()
export class LectioService {
  private demoEntriesStore: LectioEntry[] = [this.makeDemoEntry()];
  private demoLogs: LectioSyncLog[] = [];
  private demoSettings?: LectioSettings;
  constructor(
    @Inject(LECTIO_REPOSITORY) private readonly sheets: ILectioRepository,
    private readonly config: ConfigService,
    private readonly integrations: IntegrationConfigService,
    private readonly cnbbProvider: CnbbLectioProvider,
    private readonly cancaoNovaProvider: CancaoNovaLectioProvider,
    private readonly providerManager: LectioProviderManager,
    private readonly migration: LectioMigrationService,
  ) {}
  private todayIso(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  }
  private makeDemoEntry(): LectioEntry {
    const date = this.todayIso();
    return {
      id: `lectio-${date}`,
      date,
      title: 'Permanecei no meu amor',
      celebration: 'Liturgia do dia',
      liturgicalTime: 'Tempo Comum',
      liturgicalColor: 'Verde',
      firstReadingReference: 'Leitura do dia',
      firstReadingTitle: 'Primeira Leitura',
      firstReadingText: 'Conteúdo de demonstração. Na Sprint 4.1.2 esta leitura poderá ser importada da CNBB.',
      psalmReference: 'Salmo responsorial',
      psalmResponse: 'O Senhor é minha luz e salvação.',
      psalmText: '',
      secondReadingReference: '',
      secondReadingTitle: '',
      secondReadingText: '',
      acclamationReference: '',
      acclamationText: 'Aleluia, aleluia, aleluia.',
      gospelReference: 'João 15, 9-12',
      gospelTitle: 'Proclamação do Evangelho',
      gospelText: 'Como meu Pai me amou, assim também eu vos amei.',
      entranceAntiphon: '',
      communionAntiphon: '',
      reflection: 'Em quais situações tenho dificuldade de permanecer no amor de Cristo?',
      prayer: 'Senhor Jesus, ensina-me a receber e partilhar teu amor.',
      source: 'MANUAL',
      status: 'MANUAL',
      protected: true,
      syncedAt: '',
      updatedAt: new Date().toISOString(),
      active: true,
    };
  }
  private parseBool(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value.trim() === '') return fallback;
    return ['true', '1', 'sim', 'yes', 'ativo'].includes(value.trim().toLowerCase());
  }
  private source(value: string | undefined, fallback: LectioSource): LectioSource {
    return value?.trim().toUpperCase() === 'CANCAO_NOVA' ? 'CANCAO_NOVA' : value?.trim().toUpperCase() === 'CNBB' ? 'CNBB' : fallback;
  }
  private defaultSettings(): LectioSettings {
    return {
      primarySource: this.source(this.config.get<string>('LECTIO_PRIMARY_SOURCE'), 'CNBB'),
      fallbackSource: this.source(this.config.get<string>('LECTIO_FALLBACK_SOURCE'), 'CANCAO_NOVA'),
      cnbbEnabled: this.parseBool(this.config.get<string>('LECTIO_CNBB_ENABLED'), true),
      cancaoNovaEnabled: this.parseBool(this.config.get<string>('LECTIO_CANCAO_NOVA_ENABLED'), true),
      retentionDays: Math.min(30, Math.max(1, Number(this.config.get<string>('LECTIO_RETENTION_DAYS', '7')) || 7)),
      deleteOldRecords: this.parseBool(this.config.get<string>('LECTIO_DELETE_OLD_RECORDS'), true),
    };
  }
  private rowToEntry(row: SheetRecord): LectioEntry {
    return {
      id: row.id || '',
      date: (row.data || '').slice(0, 10),
      title: row.titulo || '',
      celebration: row.celebracao || '',
      liturgicalTime: row.tempo_liturgico || '',
      liturgicalColor: row.cor_liturgica || '',
      firstReadingReference: row.primeira_leitura_referencia || '',
      firstReadingTitle: row.primeira_leitura_titulo || '',
      firstReadingText: row.primeira_leitura_texto || '',
      psalmReference: row.salmo_referencia || '',
      psalmResponse: row.salmo_responsorio || '',
      psalmText: row.salmo_texto || '',
      secondReadingReference: row.segunda_leitura_referencia || '',
      secondReadingTitle: row.segunda_leitura_titulo || '',
      secondReadingText: row.segunda_leitura_texto || '',
      acclamationReference: row.aclamacao_referencia || '',
      acclamationText: row.aclamacao_texto || row.aclamacao || '',
      gospelReference: row.evangelho_referencia || '',
      gospelTitle: row.evangelho_titulo || '',
      gospelText: row.evangelho_texto || '',
      entranceAntiphon: row.antifona_entrada || '',
      communionAntiphon: row.antifona_comunhao || '',
      reflection: row.reflexao || '',
      prayer: row.oracao || '',
      source: row.fonte === 'CNBB' || row.fonte === 'CANCAO_NOVA' ? row.fonte : 'MANUAL',
      status: ['SINCRONIZADA', 'FONTE_ALTERNATIVA', 'REVISADA', 'MANUAL', 'ERRO'].includes(row.status) ? row.status as LectioEntry['status'] : 'MANUAL',
      protected: this.sheets.parseActive(row.protegido || ''),
      syncedAt: row.sincronizado_em || '',
      updatedAt: row.atualizado_em || '',
      active: this.sheets.parseActive(row.ativo || '', true),
    };
  }
  private entryToRow(entry: LectioEntry): Record<string, string | boolean> {
    return {
      id: entry.id, data: entry.date, titulo: entry.title, celebracao: entry.celebration,
      tempo_liturgico: entry.liturgicalTime, cor_liturgica: entry.liturgicalColor,
      primeira_leitura_referencia: entry.firstReadingReference, primeira_leitura_titulo: entry.firstReadingTitle, primeira_leitura_texto: entry.firstReadingText,
      salmo_referencia: entry.psalmReference, salmo_responsorio: entry.psalmResponse, salmo_texto: entry.psalmText,
      segunda_leitura_referencia: entry.secondReadingReference, segunda_leitura_titulo: entry.secondReadingTitle, segunda_leitura_texto: entry.secondReadingText,
      aclamacao_referencia: entry.acclamationReference, aclamacao_texto: entry.acclamationText, evangelho_referencia: entry.gospelReference, evangelho_titulo: entry.gospelTitle, evangelho_texto: entry.gospelText,
      antifona_entrada: entry.entranceAntiphon, antifona_comunhao: entry.communionAntiphon,
      reflexao: entry.reflection, oracao: entry.prayer, fonte: entry.source,
      status: entry.status, protegido: entry.protected, sincronizado_em: entry.syncedAt, atualizado_em: entry.updatedAt, ativo: entry.active,
    };
  }
  async list(): Promise<LectioEntry[]> {
    await this.migration.ensureCurrentSchema();
    const entries = this.sheets.isDemo()
      ? this.demoEntriesStore
      : (await this.sheets.read('Lectio')).map((row) => this.rowToEntry(row));
    return entries.filter((entry) => entry.active).sort((a, b) => b.date.localeCompare(a.date));
  }
  async today(date?: string): Promise<LectioEntry | null> {
    const target = date?.slice(0, 10) || this.todayIso();
    return (await this.list()).find((item) => item.date === target) ?? null;
  }
  async findOne(id: string): Promise<LectioEntry> {
    const item = (await this.list()).find((entry) => entry.id === id);
    if (!item) throw new NotFoundException('Lectio não encontrada.');
    return item;
  }
  async create(dto: UpsertLectioDto): Promise<LectioEntry> {
    const current = await this.list();
    if (current.some((entry) => entry.date === dto.date.slice(0, 10))) {
      throw new BadRequestException('Já existe uma Lectio para esta data. Edite o registro existente.');
    }
    const now = new Date().toISOString();
    const entry = this.fromDto(dto, {
      id: dto.id?.trim() || randomUUID(),
      status: dto.status || 'MANUAL',
      source: dto.source || 'MANUAL',
      protected: dto.protected ?? true,
      updatedAt: now,
    });
    if (this.sheets.isDemo()) this.demoEntriesStore.push(entry);
    else await this.sheets.appendRecord('Lectio', this.entryToRow(entry));
    await this.applyRetention('CADASTRO_MANUAL');
    return entry;
  }
  async update(id: string, dto: UpsertLectioDto): Promise<LectioEntry> {
    const previous = await this.findOne(id);
    const duplicate = (await this.list()).find((entry) => entry.date === dto.date.slice(0, 10) && entry.id !== id);
    if (duplicate) throw new BadRequestException('Já existe outra Lectio para esta data.');
    const entry = this.fromDto(dto, {
      ...previous,
      id,
      status: dto.status || (previous.status === 'MANUAL' ? 'MANUAL' : 'REVISADA'),
      protected: dto.protected ?? previous.protected,
      updatedAt: new Date().toISOString(),
    });
    if (this.sheets.isDemo()) this.demoEntriesStore = this.demoEntriesStore.map((item) => item.id === id ? entry : item);
    else await this.sheets.updateRecord('Lectio', 'id', id, this.entryToRow(entry));
    await this.applyRetention('EDICAO_MANUAL');
    return entry;
  }
  private fromDto(dto: UpsertLectioDto, base: Partial<LectioEntry>): LectioEntry {
    return {
      id: base.id || randomUUID(), date: dto.date.slice(0, 10), title: dto.title.trim(),
      celebration: dto.celebration?.trim() || '', liturgicalTime: dto.liturgicalTime?.trim() || '', liturgicalColor: dto.liturgicalColor?.trim() || '',
      firstReadingReference: dto.firstReadingReference?.trim() || '', firstReadingTitle: dto.firstReadingTitle?.trim() || '', firstReadingText: dto.firstReadingText?.trim() || '',
      psalmReference: dto.psalmReference?.trim() || '', psalmResponse: dto.psalmResponse?.trim() || '', psalmText: dto.psalmText?.trim() || '',
      secondReadingReference: dto.secondReadingReference?.trim() || '', secondReadingTitle: dto.secondReadingTitle?.trim() || '', secondReadingText: dto.secondReadingText?.trim() || '',
      acclamationReference: dto.acclamationReference?.trim() || '', acclamationText: dto.acclamationText?.trim() || '', gospelReference: dto.gospelReference?.trim() || '', gospelTitle: dto.gospelTitle?.trim() || '', gospelText: dto.gospelText?.trim() || '',
      entranceAntiphon: dto.entranceAntiphon?.trim() || '', communionAntiphon: dto.communionAntiphon?.trim() || '',
      reflection: dto.reflection?.trim() || '', prayer: dto.prayer?.trim() || '',
      source: dto.source || base.source || 'MANUAL',
      status: dto.status || base.status || 'MANUAL', protected: dto.protected ?? base.protected ?? true,
      syncedAt: base.syncedAt || '', updatedAt: base.updatedAt || new Date().toISOString(),
      active: dto.active ?? base.active ?? true,
    };
  }
  private comparable(entry: LectioEntry): string {
    const normalized = {
      date: entry.date, title: entry.title, celebration: entry.celebration,
      liturgicalTime: entry.liturgicalTime, liturgicalColor: entry.liturgicalColor,
      firstReadingReference: entry.firstReadingReference, firstReadingTitle: entry.firstReadingTitle, firstReadingText: entry.firstReadingText,
      psalmReference: entry.psalmReference, psalmResponse: entry.psalmResponse, psalmText: entry.psalmText,
      secondReadingReference: entry.secondReadingReference, secondReadingTitle: entry.secondReadingTitle, secondReadingText: entry.secondReadingText,
      acclamationReference: entry.acclamationReference, acclamationText: entry.acclamationText, gospelReference: entry.gospelReference, gospelTitle: entry.gospelTitle, gospelText: entry.gospelText,
      entranceAntiphon: entry.entranceAntiphon, communionAntiphon: entry.communionAntiphon,
    };
    return JSON.stringify(normalized).replace(/\s+/g, ' ').trim();
  }
  private async logSync(result: LectioSyncResult, error = ''): Promise<void> {
    const processed = result.entry ? 1 : 0;
    const created = result.status === 'CRIADA' ? 1 : 0;
    const updated = result.status === 'ATUALIZADA' ? 1 : 0;
    const payload = {
      id: randomUUID(), modulo: 'Lectio', operacao: 'SINCRONIZAR', fonte: result.source,
      status: result.status === 'ERRO' ? 'ERRO' : 'SUCESSO', iniciado_em: result.startedAt,
      finalizado_em: result.finishedAt, registros_processados: processed, registros_criados: created,
      registros_atualizados: updated, registros_removidos: 0, mensagem_erro: error,
      detalhes: JSON.stringify({ liturgyDate: result.date, primarySource: result.primarySource, usedSource: result.source,
        attempts: result.attempts, fallbackUsed: result.fallbackUsed, providerErrors: result.providerErrors,
        syncStatus: result.status, message: result.message, providerAttempts: result.providerAttempts }),
    };
    if (this.sheets.isDemo()) {
      this.demoLogs.unshift({
        id: String(payload.id), liturgyDate: result.date, primarySource: result.primarySource, usedSource: result.source,
        status: result.status === 'ERRO' ? 'ERRO' : 'SUCESSO', attempts: result.attempts, created, updated, removed: 0,
        protected: result.status === 'PRESERVADA' ? 1 : 0, error: error || result.message,
        startedAt: result.startedAt, finishedAt: result.finishedAt,
      });
    } else await this.sheets.appendRecord('HistoricoIntegracoes', payload);
  }
  private providerEnabled(source: LectioSource, settings: LectioSettings): boolean {
    return source === 'CNBB' ? settings.cnbbEnabled : settings.cancaoNovaEnabled;
  }
  private async fetchProvider(source: LectioSource, date: string, force = false) {
    return source === 'CNBB' ? this.cnbbProvider.fetch(date, force) : this.cancaoNovaProvider.fetch(date, force);
  }
  private async persistImported(parsed: Awaited<ReturnType<LectioService['fetchProvider']>>, source: LectioSource, primarySource: LectioSource,
    target: string, startedAt: string, attempts: number, providerErrors: Partial<Record<LectioSource, string>>, providerAttempts: ProviderAttempt[] = []): Promise<LectioSyncResult> {
    const current = (await this.list()).find((entry) => entry.date === target);
    const now = new Date().toISOString();
    const fallbackUsed = source !== primarySource;
    const incoming: LectioEntry = {
      ...parsed, id: current?.id || randomUUID(), reflection: current?.reflection || '', prayer: current?.prayer || '',
      status: fallbackUsed ? 'FONTE_ALTERNATIVA' : 'SINCRONIZADA', protected: false, syncedAt: now, updatedAt: now, active: true,
    };
    let status: LectioSyncResult['status']; let message: string; let entry: LectioEntry = incoming;
    if (current && (current.protected || current.status === 'MANUAL' || current.status === 'REVISADA')) {
      status = 'PRESERVADA'; message = 'O conteúdo existente foi preservado por estar manual, revisado ou protegido.'; entry = current;
    } else if (!current) {
      status = 'CRIADA'; message = `Liturgia importada de ${source === 'CNBB' ? 'CNBB' : 'Canção Nova'} e criada com sucesso.`;
      if (this.sheets.isDemo()) this.demoEntriesStore.push(incoming); else await this.sheets.appendRecord('Lectio', this.entryToRow(incoming));
    } else if (this.comparable(current) === this.comparable(incoming)) {
      status = 'SEM_ALTERACOES'; message = `${source === 'CNBB' ? 'CNBB' : 'Canção Nova'} não apresentou alterações no conteúdo salvo.`; entry = current;
    } else {
      status = 'ATUALIZADA'; message = `Alterações detectadas e conteúdo atualizado por ${source === 'CNBB' ? 'CNBB' : 'Canção Nova'}.`;
      if (this.sheets.isDemo()) this.demoEntriesStore = this.demoEntriesStore.map((item) => item.id === current.id ? incoming : item);
      else await this.sheets.updateRecord('Lectio', 'id', current.id, this.entryToRow(incoming));
    }
    await this.applyRetention(`SINCRONIZACAO_${source}`);
    const result: LectioSyncResult = { status, date: target, source, primarySource, fallbackUsed,
      attempts, providerErrors, providerAttempts, changed: status === 'CRIADA' || status === 'ATUALIZADA', message,
      startedAt, finishedAt: new Date().toISOString(), entry };
    await this.logSync(result);
    return result;
  }
  private async logProviderAttempts(date: string, primarySource: LectioSource, attempts: ProviderAttempt[]): Promise<void> {
    if (this.sheets.isDemo()) return;
    for (const attempt of attempts) {
      await this.sheets.appendRecord('HistoricoIntegracoes', {
        id: randomUUID(), modulo: 'Lectio', operacao: 'TENTATIVA_PROVIDER', fonte: attempt.source,
        status: attempt.status, iniciado_em: attempt.startedAt, finalizado_em: attempt.finishedAt,
        registros_processados: attempt.status === 'SUCESSO' ? 1 : 0, registros_criados: 0,
        registros_atualizados: 0, registros_removidos: 0, mensagem_erro: attempt.error,
        detalhes: JSON.stringify({ liturgyDate: date, primarySource, provider: attempt.source,
          priority: attempt.priority, durationMs: attempt.durationMs, fromCache: attempt.fromCache,
          providerStatus: attempt.status }),
      });
    }
  }
  async sync(date?: string, force = false): Promise<LectioSyncResult> {
    const target = date?.slice(0, 10) || this.todayIso();
    const startedAt = new Date().toISOString();
    const settings = await this.getSettings();
    const managerResult = await this.providerManager.execute(target, settings, force);
    await this.logProviderAttempts(target, settings.primarySource, managerResult.attempts);
    const providerErrors = Object.fromEntries(managerResult.attempts
      .filter((attempt) => attempt.status !== 'SUCESSO')
      .map((attempt) => [attempt.source, attempt.error])) as Partial<Record<LectioSource, string>>;
    if (managerResult.parsed && managerResult.usedSource) {
      return this.persistImported(managerResult.parsed, managerResult.usedSource, settings.primarySource,
        target, startedAt, managerResult.attempts.length, providerErrors, managerResult.attempts);
    }
    const current = (await this.list()).find((entry) => entry.date === target) ?? null;
    const message = current
      ? 'As fontes configuradas falharam. O último conteúdo salvo foi mantido.'
      : 'As fontes configuradas falharam e ainda não existe conteúdo salvo para esta data.';
    const result: LectioSyncResult = { status: 'ERRO', date: target, source: settings.primarySource,
      primarySource: settings.primarySource, fallbackUsed: false, attempts: managerResult.attempts.length,
      providerErrors, providerAttempts: managerResult.attempts, changed: false, message,
      startedAt, finishedAt: new Date().toISOString(), entry: current };
    await this.logSync(result, Object.values(providerErrors).join(' | '));
    throw new BadRequestException({ message, providerErrors, providerAttempts: managerResult.attempts, keptExistingContent: Boolean(current) });
  }
  async syncCnbb(date?: string): Promise<LectioSyncResult> {
    const settings = await this.getSettings();
    if (!settings.cnbbEnabled) throw new BadRequestException('A fonte CNBB está desativada nas integrações.');
    const original = this.demoSettings;
    if (this.sheets.isDemo()) this.demoSettings = { ...settings, primarySource: 'CNBB', fallbackSource: 'CANCAO_NOVA', cancaoNovaEnabled: false };
    try {
      const target = date?.slice(0, 10) || this.todayIso(); const startedAt = new Date().toISOString();
      const parsed = await this.cnbbProvider.fetch(target, true);
      return await this.persistImported(parsed, 'CNBB', 'CNBB', target, startedAt, 1, {});
    } finally { if (this.sheets.isDemo()) this.demoSettings = original; }
  }
  async providerStatus(): Promise<Array<{ source: LectioSource; enabled: boolean; priority: number; role: 'PRINCIPAL' | 'FALLBACK'; lastStatus: string; lastSyncAt: string; lastError: string }>> {
    const settings = await this.getSettings(); const logs = await this.logs();
    return [settings.primarySource, settings.fallbackSource].map((source, index) => {
      const last = logs.find((log) => log.usedSource === source || log.primarySource === source);
      return { source, enabled: this.providerEnabled(source, settings), priority: index + 1, role: index === 0 ? 'PRINCIPAL' : 'FALLBACK',
        lastStatus: last?.status || 'NUNCA_EXECUTADA', lastSyncAt: last?.finishedAt || '', lastError: last?.status === 'ERRO' ? last.error : '' };
    });
  }
  async getSettings(): Promise<LectioSettings> {
    if (this.sheets.isDemo()) return this.demoSettings || this.defaultSettings();
    const defaults = this.defaultSettings();
    const rows = await this.integrations.list('Lectio');
    const map = new Map(rows.map((row) => [row.key, row.value]));
    return {
      primarySource: this.source(map.get(LECTIO_SETTING_KEYS.primarySource), defaults.primarySource),
      fallbackSource: this.source(map.get(LECTIO_SETTING_KEYS.fallbackSource), defaults.fallbackSource),
      cnbbEnabled: this.parseBool(map.get(LECTIO_SETTING_KEYS.cnbbEnabled), defaults.cnbbEnabled),
      cancaoNovaEnabled: this.parseBool(map.get(LECTIO_SETTING_KEYS.cancaoNovaEnabled), defaults.cancaoNovaEnabled),
      retentionDays: Math.min(30, Math.max(1, Number(map.get(LECTIO_SETTING_KEYS.retentionDays)) || defaults.retentionDays)),
      deleteOldRecords: this.parseBool(map.get(LECTIO_SETTING_KEYS.deleteOldRecords), defaults.deleteOldRecords),
    };
  }
  async updateSettings(dto: UpdateLectioSettingsDto): Promise<LectioSettings> {
    if (dto.primarySource === dto.fallbackSource) throw new BadRequestException('A fonte principal e a alternativa devem ser diferentes.');
    if ((dto.primarySource === 'CNBB' && !dto.cnbbEnabled) || (dto.primarySource === 'CANCAO_NOVA' && !dto.cancaoNovaEnabled)) {
      throw new BadRequestException('A fonte principal precisa estar ativada.');
    }
    const settings: LectioSettings = { ...dto };
    if (this.sheets.isDemo()) this.demoSettings = settings;
    else {
      for (const [field, key] of Object.entries(LECTIO_SETTING_KEYS) as Array<[keyof LectioSettings, string]>) {
        await this.integrations.upsert('Lectio', key, String(settings[field]), {
          type: typeof settings[field] === 'boolean' ? 'BOOLEAN' : typeof settings[field] === 'number' ? 'NUMBER' : 'STRING',
          description: `Configuração do módulo Lectio: ${field}`,
          active: true,
        });
      }
    }
    await this.applyRetention('ALTERACAO_CONFIGURACAO');
    return settings;
  }
  async applyRetention(reason = 'MANUAL'): Promise<{ kept: number; removed: number; protected: number; limitDate: string }> {
    const settings = await this.getSettings();
    const now = new Date(`${this.todayIso()}T12:00:00-03:00`);
    const limit = new Date(now);
    limit.setDate(limit.getDate() - (settings.retentionDays - 1));
    const limitDate = limit.toISOString().slice(0, 10);
    const all = this.sheets.isDemo() ? [...this.demoEntriesStore] : (await this.sheets.read('Lectio')).map((row) => this.rowToEntry(row));
    let removed = 0;
    let protectedCount = 0;
    const kept = all.filter((entry) => {
      if (!settings.deleteOldRecords || entry.date >= limitDate) return true;
      if (entry.protected || entry.status === 'MANUAL' || entry.status === 'REVISADA') {
        protectedCount += 1;
        return true;
      }
      removed += 1;
      return false;
    });
    if (removed > 0) {
      if (this.sheets.isDemo()) this.demoEntriesStore = kept;
      else await this.sheets.replaceRecords('Lectio', kept.map((entry) => this.entryToRow(entry)));
    }
    await this.logCleanup(reason, removed, protectedCount);
    return { kept: kept.length, removed, protected: protectedCount, limitDate };
  }
  private async logCleanup(reason: string, removed: number, protectedCount: number): Promise<void> {
    const settings = await this.getSettings();
    const now = new Date().toISOString();
    const log: LectioSyncLog = {
      id: randomUUID(), liturgyDate: this.todayIso(), primarySource: settings.primarySource, usedSource: '',
      status: 'LIMPEZA', attempts: 0, created: 0, updated: 0, removed, protected: protectedCount,
      error: reason, startedAt: now, finishedAt: now,
    };
    if (this.sheets.isDemo()) this.demoLogs.unshift(log);
    else await this.sheets.appendRecord('HistoricoIntegracoes', {
      id: log.id, modulo: 'Lectio', operacao: 'LIMPEZA_RETENCAO', fonte: 'SISTEMA', status: log.status,
      iniciado_em: now, finalizado_em: now, registros_processados: removed + protectedCount, registros_criados: 0,
      registros_atualizados: 0, registros_removidos: removed, mensagem_erro: '',
      detalhes: JSON.stringify({ reason, protected: protectedCount, retentionDays: settings.retentionDays }),
    });
  }
  async logs(): Promise<LectioSyncLog[]> {
    if (this.sheets.isDemo()) return this.demoLogs;
    return (await this.sheets.read('HistoricoIntegracoes')).filter(row => (row.modulo || '').toUpperCase() === 'LECTIO').map((row): LectioSyncLog => {
      let details: Record<string, unknown> = {};
      try { details = JSON.parse(row.detalhes || '{}') as Record<string, unknown>; } catch { details = {}; }
      return {
        id: row.id || '', liturgyDate: String(details.liturgyDate || this.todayIso()), primarySource: this.source(String(details.primarySource || ''), 'CNBB'),
        usedSource: row.fonte === 'CNBB' || row.fonte === 'CANCAO_NOVA' ? row.fonte as LectioSource : '',
        status: row.status === 'SUCESSO' || row.status === 'ERRO' ? row.status as 'SUCESSO' | 'ERRO' : 'LIMPEZA', attempts: Number(details.attempts || 0),
        created: Number(row.registros_criados || 0), updated: Number(row.registros_atualizados || 0), removed: Number(row.registros_removidos || 0),
        protected: Number(details.protected || 0), error: row.mensagem_erro || String(details.reason || ''), startedAt: row.iniciado_em || '', finishedAt: row.finalizado_em || '',
      };
    }).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
}
