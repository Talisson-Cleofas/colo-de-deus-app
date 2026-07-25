import { ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { google } from 'googleapis';
import { SHEET_SCHEMAS, type SheetName } from './sheet-schemas';
import { MemoryCacheService } from '../performance/memory-cache.service';

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  photo: string;
  role: string;
  ministry: string;
  cell: string;
  phone: string;
  profile: 'DEVELOPER' | 'MISSION_LEADER' | 'ADMIN' | 'MINISTRY_LEADER' | 'CELL_LEADER' | 'MEMBER';
  active: boolean;
  bio: string;
  instagram: string;
  birthDate: string;
  joinedAt: string;
  city: string;
  state: string;
  gifts: string[];
  formator: string;
  updatedAt: string;
  deletedAt: string;
  deletedBy: string;
  createdBy: string;
  updatedBy: string;
};

export type CreateMemberInput = Omit<MemberRow, 'id' | 'joinedAt' | 'updatedAt' | 'deletedAt' | 'deletedBy' | 'createdBy' | 'updatedBy'>;
export type SheetRecord = Record<string, string>;

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private membersCache: { expiresAt: number; value: MemberRow[] } | null = null;
  private membersByEmail = new Map<string, MemberRow>();
  private membersById = new Map<string, MemberRow>();
  private recordsByTabAndId = new Map<string, Map<string, SheetRecord>>();
  private structureCache: {
    expiresAt: number;
    metadata: Array<{ title: string; sheetId: number }>;
    headers: Map<string, string[]>;
  } | null = null;
  private ensureAllTabsInFlight: Promise<Array<{ tab: string; created: boolean; addedColumns: string[] }>> | null = null;

  constructor(private readonly config: ConfigService, private readonly memoryCache: MemoryCacheService) {}

  isDemo(): boolean {
    return this.config.get<string>('DEMO_MODE', 'true') === 'true';
  }

  schemas() {
    return SHEET_SCHEMAS;
  }

  private spreadsheetId(): string {
    const value = this.config.get<string>('GOOGLE_SHEETS_ID')?.trim();
    if (!value) throw new ServiceUnavailableException('GOOGLE_SHEETS_ID não configurado.');
    return value;
  }

  private client() {
    const clientEmail = (
      this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL') ||
      this.config.get<string>('FIREBASE_CLIENT_EMAIL')
    )?.trim();
    const privateKey = (
      this.config.get<string>('GOOGLE_PRIVATE_KEY') ||
      this.config.get<string>('FIREBASE_PRIVATE_KEY')
    )?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      throw new ServiceUnavailableException(
        'Credenciais do Google Sheets não configuradas. Use GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY.',
      );
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
  }

  private columnName(index: number): string {
    let value = index;
    let output = '';
    while (value > 0) {
      const remainder = (value - 1) % 26;
      output = String.fromCharCode(65 + remainder) + output;
      value = Math.floor((value - 1) / 26);
    }
    return output;
  }

  private cacheTtlMs(): number {
    const seconds = Number(this.config.get<string>('GOOGLE_SHEETS_STRUCTURE_CACHE_SECONDS', '60'));
    return Math.max(10, Number.isFinite(seconds) ? seconds : 60) * 1_000;
  }


  private dataCacheTtlMs(): number {
    const seconds = Number(this.config.get<string>('GOOGLE_SHEETS_DATA_CACHE_SECONDS', '45'));
    return Math.max(5, Number.isFinite(seconds) ? seconds : 45) * 1_000;
  }

  private invalidateDataCache(tab?: string): void {
    this.memoryCache.invalidateTag('google-sheets-data');
    if (tab) this.recordsByTabAndId.delete(tab); else this.recordsByTabAndId.clear();
  }


  private staleCacheTtlMs(): number {
    const seconds = Number(this.config.get<string>('GOOGLE_SHEETS_STALE_CACHE_SECONDS', '900'));
    return Math.max(60, Number.isFinite(seconds) ? seconds : 900) * 1_000;
  }

  async readIndexed(tab: string, idHeader = 'id'): Promise<Map<string, SheetRecord>> {
    const existing = this.recordsByTabAndId.get(tab);
    if (existing) return existing;
    const records = await this.read(tab);
    const index = new Map(records.filter((record) => record[idHeader]).map((record) => [record[idHeader], record]));
    this.recordsByTabAndId.set(tab, index);
    return index;
  }

  async findRecordById(tab: string, id: string, idHeader = 'id'): Promise<SheetRecord | null> {
    return (await this.readIndexed(tab, idHeader)).get(id) ?? null;
  }

  private retryAttempts(): number {
    const attempts = Number(this.config.get<string>('GOOGLE_SHEETS_RETRY_ATTEMPTS', '6'));
    return Math.min(8, Math.max(1, Number.isFinite(attempts) ? attempts : 6));
  }

  private errorStatus(error: unknown): number | undefined {
    const candidate = error as { code?: number; response?: { status?: number }; status?: number };
    return candidate?.response?.status ?? candidate?.status ?? candidate?.code;
  }

  private isRetryable(error: unknown): boolean {
    const status = this.errorStatus(error);
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504 ||
      message.includes('quota exceeded') || message.includes('rate limit') || message.includes('resource_exhausted');
  }

  private async withRetry<T>(operation: string, task: () => Promise<T>): Promise<T> {
    const attempts = this.retryAttempts();
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (!this.isRetryable(error) || attempt === attempts) throw error;
        const base = Math.min(15_000, 1_000 * 2 ** (attempt - 1));
        const waitMs = base + Math.floor(Math.random() * 500);
        this.logger.warn(`[SheetsRetry] ${operation} falhou (${attempt}/${attempts}). Nova tentativa em ${waitMs}ms.`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    throw lastError;
  }

  private quoteTab(tab: string): string {
    return `'${tab.replace(/'/g, "''")}'`;
  }

  private invalidateStructureCache(): void {
    this.structureCache = null;
  }

  async readRows(range: string): Promise<string[][]> {
    if (this.isDemo()) return [];
    return this.memoryCache.remember(`sheets:range:${range}`, this.dataCacheTtlMs(), async () => {
      try {
        const response = await this.withRetry(`values.get ${range}`, () => this.client().spreadsheets.values.get({ spreadsheetId: this.spreadsheetId(), range }));
        return (response.data.values ?? []).map((row) => row.map((value) => String(value ?? '')));
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        const detail = error instanceof Error ? error.message : 'erro desconhecido';
        throw new ServiceUnavailableException(`Não foi possível consultar o Google Sheets: ${detail}`);
      }
    }, ['google-sheets-data', `google-sheets-range:${range}`], this.staleCacheTtlMs());
  }

  async batchReadRows(ranges: string[]): Promise<Map<string, string[][]>> {
    const output = new Map<string, string[][]>();
    if (this.isDemo() || !ranges.length) return output;
    try {
      const response = await this.withRetry('values.batchGet', () => this.client().spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId(),
        ranges,
        majorDimension: 'ROWS',
      }));
      (response.data.valueRanges ?? []).forEach((valueRange, index) => {
        const requestedRange = ranges[index];
        const rows = (valueRange.values ?? []).map((row) => row.map((value) => String(value ?? '')));
        output.set(requestedRange, rows);
      });
      return output;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      throw new ServiceUnavailableException(`Não foi possível consultar os cabeçalhos em lote: ${detail}`);
    }
  }

  async appendRows(range: string, values: Array<Array<string | number | boolean>>): Promise<void> {
    if (this.isDemo()) return;
    try {
      await this.withRetry(`values.append ${range}`, () => this.client().spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId(), range, valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS', requestBody: { values },
      }));
      this.membersCache = null;
      this.membersByEmail.clear();
      this.membersById.clear();
      this.invalidateDataCache();
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      throw new ServiceUnavailableException(`Não foi possível gravar no Google Sheets: ${detail}`);
    }
  }

  async updateRows(range: string, values: Array<Array<string | number | boolean>>): Promise<void> {
    if (this.isDemo()) return;
    try {
      await this.withRetry(`values.update ${range}`, () => this.client().spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId(), range, valueInputOption: 'USER_ENTERED', requestBody: { values },
      }));
      this.membersCache = null;
      this.membersByEmail.clear();
      this.membersById.clear();
      this.invalidateDataCache();
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      throw new ServiceUnavailableException(`Não foi possível atualizar o Google Sheets: ${detail}`);
    }
  }

  private async loadStructureSnapshot(forceRefresh = false): Promise<{
    metadata: Array<{ title: string; sheetId: number }>;
    headers: Map<string, string[]>;
  }> {
    if (this.isDemo()) return { metadata: [], headers: new Map() };
    if (!forceRefresh && this.structureCache && this.structureCache.expiresAt > Date.now()) {
      return { metadata: this.structureCache.metadata, headers: new Map(this.structureCache.headers) };
    }

    try {
      const response = await this.withRetry('spreadsheets.get metadata', () => this.client().spreadsheets.get({
        spreadsheetId: this.spreadsheetId(),
        fields: 'sheets.properties(sheetId,title)',
      }));
      const metadata = (response.data.sheets ?? [])
        .map((sheet) => ({ title: String(sheet.properties?.title ?? ''), sheetId: Number(sheet.properties?.sheetId ?? -1) }))
        .filter((sheet) => sheet.title && sheet.sheetId >= 0);

      const expectedTabs = Object.keys(SHEET_SCHEMAS).filter((tab) => metadata.some((sheet) => sheet.title === tab));
      const ranges = expectedTabs.map((tab) => `${this.quoteTab(tab)}!1:1`);
      const batch = await this.batchReadRows(ranges);
      const headers = new Map<string, string[]>();
      expectedTabs.forEach((tab, index) => {
        const row = batch.get(ranges[index])?.[0] ?? [];
        headers.set(tab, row.map((value) => value.trim()).filter(Boolean));
      });

      this.structureCache = { expiresAt: Date.now() + this.cacheTtlMs(), metadata, headers };
      return { metadata, headers: new Map(headers) };
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'erro desconhecido';
      throw new ServiceUnavailableException(`Não foi possível consultar a estrutura da planilha: ${detail}`);
    }
  }

  private async ensureTabsBatch(entries: Array<[string, readonly string[]]>): Promise<Array<{ tab: string; created: boolean; addedColumns: string[] }>> {
    if (this.isDemo()) return entries.map(([tab]) => ({ tab, created: false, addedColumns: [] }));
    const client = this.client();
    const spreadsheetId = this.spreadsheetId();
    const snapshot = await this.loadStructureSnapshot();
    const existingTitles = new Set(snapshot.metadata.map((sheet) => sheet.title));
    const missingTabs = entries.filter(([tab]) => !existingTitles.has(tab));

    if (missingTabs.length) {
      await this.withRetry('spreadsheets.batchUpdate addSheet', () => client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: missingTabs.map(([tab]) => ({ addSheet: { properties: { title: tab } } })) },
      }));
    }

    const reports = entries.map(([tab, expected]) => {
      const current = snapshot.headers.get(tab) ?? [];
      const missing = expected.filter((header) => !current.includes(header));
      return { tab, created: !existingTitles.has(tab), addedColumns: missing, finalHeaders: [...current, ...missing] };
    });

    const updates = reports
      .filter((report) => report.created || report.addedColumns.length > 0 || report.finalHeaders.length === 0)
      .map((report) => ({
        range: `${this.quoteTab(report.tab)}!A1:${this.columnName(report.finalHeaders.length)}1`,
        majorDimension: 'ROWS' as const,
        values: [report.finalHeaders],
      }));

    if (updates.length) {
      await this.withRetry('values.batchUpdate headers', () => client.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: 'RAW', data: updates },
      }));
    }

    const metadata = [...snapshot.metadata];
    missingTabs.forEach(([tab], index) => metadata.push({ title: tab, sheetId: -1000 - index }));
    const headers = new Map(snapshot.headers);
    reports.forEach((report) => headers.set(report.tab, report.finalHeaders));
    this.structureCache = { expiresAt: Date.now() + this.cacheTtlMs(), metadata, headers };

    return reports.map(({ tab, created, addedColumns }) => ({ tab, created, addedColumns }));
  }

  async ensureTab(tab: string, headers: readonly string[]): Promise<{ created: boolean; addedColumns: string[] }> {
    const [result] = await this.ensureTabsBatch([[tab, headers]]);
    return result;
  }

  async ensureAllTabs(): Promise<Array<{ tab: string; created: boolean; addedColumns: string[] }>> {
    if (this.ensureAllTabsInFlight) return this.ensureAllTabsInFlight;
    this.ensureAllTabsInFlight = this.ensureTabsBatch(Object.entries(SHEET_SCHEMAS));
    try {
      return await this.ensureAllTabsInFlight;
    } finally {
      this.ensureAllTabsInFlight = null;
    }
  }

  async schemaStatus(forceRefresh = false): Promise<Array<{ tab: string; expected: readonly string[]; current: string[]; valid: boolean }>> {
    if (this.isDemo()) {
      return Object.entries(SHEET_SCHEMAS).map(([tab, expected]) => ({ tab, expected, current: [...expected], valid: true }));
    }
    const snapshot = await this.loadStructureSnapshot(forceRefresh);
    return Object.entries(SHEET_SCHEMAS).map(([tab, expected]) => {
      const current = snapshot.headers.get(tab) ?? [];
      const normalized = current.map((item) => item.trim());
      return { tab, expected, current, valid: expected.every((header) => normalized.includes(header)) };
    });
  }

  async migrateTabSchema(tab: SheetName, aliases: Record<string, string> = {}): Promise<boolean> {
    const expected = SHEET_SCHEMAS[tab];
    await this.ensureTab(tab, expected);
    if (this.isDemo()) return false;
    const rows = await this.readRows(`${tab}!A:ZZ`);
    if (!rows.length) return false;
    const current = rows[0].map((value) => value.trim());
    if (expected.every((header, index) => current[index] === header) && current.length === expected.length) return false;
    const records = rows.slice(1).filter((row) => row.some((value) => value.trim())).map((row) =>
      Object.fromEntries(current.map((header, index) => [aliases[header] || header, row[index] ?? ''])),
    );
    await this.replaceRecords(tab, records);
    return true;
  }

  async findRowNumber(tab: string, header: string, value: string): Promise<number | null> {
    const rows = await this.readRows(`${tab}!A:ZZ`);
    if (!rows.length) return null;
    const index = rows[0].findIndex((item) => item.trim() === header);
    if (index < 0) return null;
    const found = rows.findIndex((row, rowIndex) => rowIndex > 0 && (row[index] ?? '').trim() === value.trim());
    return found < 0 ? null : found + 1;
  }

  async read(tab: string): Promise<SheetRecord[]> {
    const rows = await this.readRows(`${tab}!A:ZZ`);
    if (!rows.length) return [];
    const [headers, ...dataRows] = rows;
    return dataRows
      .filter((row) => row.some((value) => value.trim()))
      .map((row) => Object.fromEntries(headers.map((header, index) => [header.trim(), row[index] ?? ''])));
  }

  async replaceRecords(tab: SheetName, records: Array<Record<string, string | number | boolean>>): Promise<void> {
    const headers = SHEET_SCHEMAS[tab];
    await this.ensureTab(tab, headers);
    if (this.isDemo()) return;
    const range = `${tab}!A:ZZ`;
    try {
      await this.client().spreadsheets.values.clear({ spreadsheetId: this.spreadsheetId(), range });
      const values = [[...headers], ...records.map((record) => headers.map((header) => record[header] ?? ''))];
      await this.updateRows(`${tab}!A1:${this.columnName(headers.length)}${values.length}`, values);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(`Não foi possível substituir os registros da aba ${tab}.`);
    }
  }

  private async actualHeaders(tab: SheetName): Promise<string[]> {
    await this.ensureTab(tab, SHEET_SCHEMAS[tab]);
    const rows = await this.readRows(`'${String(tab).replace(/'/g, "''")}'!1:1`);
    return (rows[0] ?? []).map((header) => header.trim()).filter(Boolean);
  }

  async appendRecord(tab: SheetName, record: Record<string, string | number | boolean>): Promise<void> {
    const headers = await this.actualHeaders(tab);
    const values = headers.map((header) => record[header] ?? '');
    await this.appendRows(`'${String(tab).replace(/'/g, "''")}'!A:${this.columnName(headers.length)}`, [values]);
  }

  async updateRecord(tab: SheetName, idHeader: string, idValue: string, record: Record<string, string | number | boolean>): Promise<void> {
    const headers = await this.actualHeaders(tab);
    const rowNumber = await this.findRowNumber(tab, idHeader, idValue);
    if (!rowNumber) throw new ServiceUnavailableException(`Registro ${idValue} não encontrado na aba ${tab}.`);
    const values = headers.map((header) => record[header] ?? '');
    await this.updateRows(`'${String(tab).replace(/'/g, "''")}'!A${rowNumber}:${this.columnName(headers.length)}${rowNumber}`, [values]);
  }

  private parseProfile(value: string): 'DEVELOPER' | 'MISSION_LEADER' | 'ADMIN' | 'MINISTRY_LEADER' | 'CELL_LEADER' | 'MEMBER' {
    const normalized = value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['DEVELOPER', 'DESENVOLVEDOR'].includes(normalized)) return 'DEVELOPER';
    if (['MISSION_LEADER','LIDER_MISSAO','LIDER MISSAO','ADMIN'].includes(normalized)) return 'MISSION_LEADER';
    if (['LIDER_MINISTERIO', 'LIDER DE MINISTERIO', 'MINISTRY_LEADER'].includes(normalized)) return 'MINISTRY_LEADER';
    if (['LIDER', 'LEADER', 'LIDER_CELULA', 'LIDER DE CELULA', 'CELL_LEADER'].includes(normalized)) return 'CELL_LEADER';
    return 'MEMBER';
  }

  parseActive(value: string, defaultValue = false): boolean {
    if (!value.trim()) return defaultValue;
    return ['sim', 'true', '1', 'ativo', 'yes'].includes(value.trim().toLowerCase());
  }

  private demoMembers(): MemberRow[] {
    return [
      { id:'1', name:'Talisson Cleofas', email:'talisson@example.com', photo:'https://i.pravatar.cc/400?img=12', role:'Coordenador', ministry:'Coordenação', cell:'Célula Ágape', phone:'(61) 99999-9999', profile:'ADMIN', active:true, bio:'Missionário e coordenador da Missão Brasília.', instagram:'@talissoncleofas', birthDate:'1997-08-14', joinedAt:'2022-02-01', city:'Brasília', state:'DF', gifts:['Liderança','Ensino','Comunicação'], formator:'', updatedAt:'', deletedAt:'', deletedBy:'', createdBy:'', updatedBy:'' },
      { id:'2', name:'Maria Clara', email:'maria@example.com', photo:'https://i.pravatar.cc/400?img=47', role:'Intercessora', ministry:'Intercessão', cell:'Célula Ágape', phone:'(61) 98888-8888', profile:'MEMBER', active:true, bio:'Serve no ministério de intercessão.', instagram:'@mariaclara', birthDate:'1995-04-22', joinedAt:'2023-03-12', city:'Brasília', state:'DF', gifts:['Intercessão','Acolhida'], formator:'Talisson Cleofas', updatedAt:'', deletedAt:'', deletedBy:'', createdBy:'', updatedBy:'' },
      { id:'3', name:'João Pedro', email:'joao@example.com', photo:'https://i.pravatar.cc/400?img=11', role:'Líder de Célula', ministry:'Acolhida', cell:'Célula Emanuel', phone:'(61) 97777-7777', profile:'CELL_LEADER', active:true, bio:'Líder da Célula Emanuel.', instagram:'@joaopedro', birthDate:'1994-11-10', joinedAt:'2021-08-20', city:'Taguatinga', state:'DF', gifts:['Acolhida','Liderança'], formator:'Talisson Cleofas', updatedAt:'', deletedAt:'', deletedBy:'', createdBy:'', updatedBy:'' },
    ];
  }

  private normalizeDate(value: string): string {
    const raw = (value ?? '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const brazilian = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brazilian) {
      const [, day, month, year] = brazilian;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  }

  async listMembers(forceRefresh = false): Promise<MemberRow[]> {
    if (this.isDemo()) return this.demoMembers();
    if (!forceRefresh && this.membersCache && this.membersCache.expiresAt > Date.now()) return this.membersCache.value;

    await this.ensureTab('Membros', SHEET_SCHEMAS.Membros);
    const rows = await this.read('Membros');
    const members = rows.map((row): MemberRow => ({
      id: row.id ?? '',
      name: row.nome ?? '',
      email: (row.email ?? '').trim().toLowerCase(),
      photo: row.foto ?? '',
      role: row.funcao || 'Membro',
      ministry: row.ministerio ?? '',
      cell: row.celula ?? '',
      phone: row.telefone ?? '',
      profile: this.parseProfile(row.perfil ?? 'MEMBER'),
      active: this.parseActive(row.ativo ?? ''),
      bio: row.bio ?? '',
      instagram: row.instagram ?? '',
      birthDate: this.normalizeDate(row.data_nascimento ?? ''),
      joinedAt: row.criado_em ?? '',
      city: row.cidade ?? '',
      state: row.estado ?? '',
      gifts: (row.dons ?? '').split(',').map((value) => value.trim()).filter(Boolean),
      formator: row.formador ?? '',
      updatedAt: row.updated_at || row.atualizado_em || '',
      deletedAt: row.deleted_at || '',
      deletedBy: row.deleted_by || '',
      createdBy: row.created_by || '',
      updatedBy: row.updated_by || '',
    })).filter((member) => !member.deletedAt);

    this.membersCache = { expiresAt: Date.now() + this.dataCacheTtlMs(), value: members };
    this.membersByEmail = new Map(members.map((member) => [member.email, member]));
    this.membersById = new Map(members.map((member) => [member.id, member]));
    return members;
  }

  async createMember(input: CreateMemberInput): Promise<MemberRow> {
    const email = input.email.trim().toLowerCase();
    const existing = (await this.listMembers()).find((member) => member.email === email);
    if (existing) {
      throw new ConflictException(
        existing.active
          ? 'Já existe um membro cadastrado com este e-mail.'
          : 'Este e-mail pertence a um membro inativo. Reative o cadastro existente.',
      );
    }

    const now = new Date().toISOString();
    const member: MemberRow = {
      id: randomUUID(),
      name: input.name.trim(),
      email,
      photo: input.photo?.trim() ?? '',
      role: input.role?.trim() || 'Membro',
      ministry: input.ministry?.trim() ?? '',
      cell: input.cell?.trim() ?? '',
      phone: input.phone?.trim() ?? '',
      profile: input.profile ?? 'MEMBER',
      active: input.active ?? true,
      bio: input.bio?.trim() ?? '',
      instagram: input.instagram?.trim() ?? '',
      birthDate: this.normalizeDate(input.birthDate ?? ''),
      joinedAt: now,
      city: input.city?.trim() ?? '',
      state: input.state?.trim() ?? '',
      gifts: (input.gifts ?? []).map((gift) => gift.trim()).filter(Boolean),
      formator: input.formator?.trim() ?? '',
      updatedAt: now,
      deletedAt: '', deletedBy: '', createdBy: '', updatedBy: '',
    };

    if (!this.isDemo()) {
      await this.appendRecord('Membros', {
        id: member.id, nome: member.name, email: member.email, foto: member.photo,
        funcao: member.role, ministerio: member.ministry, celula: member.cell,
        telefone: member.phone, perfil: member.profile, ativo: member.active ? 'TRUE' : 'FALSE',
        bio: member.bio, instagram: member.instagram, data_nascimento: member.birthDate,
        criado_em: member.joinedAt, created_at: member.joinedAt, created_by: member.createdBy, cidade: member.city, estado: member.state,
        dons: member.gifts.join(', '), formador: member.formator, atualizado_em: member.updatedAt, updated_at: member.updatedAt, updated_by: member.updatedBy, deleted_at:'', deleted_by:'',
      });
    }

    this.membersCache = null;
    this.membersByEmail.clear();
    this.membersById.clear();
    return member;
  }

  async updateMember(id: string, input: Partial<CreateMemberInput>): Promise<MemberRow> {
    const members = await this.listMembers(true);
    const current = members.find((member) => member.id === id);
    if (!current) throw new NotFoundException('Membro não encontrado.');

    const nextEmail = input.email?.trim().toLowerCase() ?? current.email;
    const duplicate = members.find((member) => member.id !== id && member.email === nextEmail);
    if (duplicate) throw new ConflictException('Já existe outro membro cadastrado com este e-mail.');

    const member: MemberRow = {
      ...current,
      name: input.name?.trim() ?? current.name,
      email: nextEmail,
      photo: input.photo?.trim() ?? current.photo,
      role: input.role?.trim() || current.role,
      ministry: input.ministry?.trim() ?? current.ministry,
      cell: input.cell?.trim() ?? current.cell,
      phone: input.phone?.trim() ?? current.phone,
      profile: input.profile ?? current.profile,
      active: input.active ?? current.active,
      bio: input.bio?.trim() ?? current.bio,
      instagram: input.instagram?.trim() ?? current.instagram,
      birthDate: input.birthDate !== undefined ? this.normalizeDate(input.birthDate) : current.birthDate,
      city: input.city?.trim() ?? current.city,
      state: input.state?.trim() ?? current.state,
      gifts: input.gifts ? input.gifts.map((gift) => gift.trim()).filter(Boolean) : current.gifts,
      formator: input.formator?.trim() ?? current.formator,
      updatedAt: new Date().toISOString(),
    };

    if (!this.isDemo()) {
      await this.updateRecord('Membros', 'id', id, {
        id: member.id, nome: member.name, email: member.email, foto: member.photo,
        funcao: member.role, ministerio: member.ministry, celula: member.cell,
        telefone: member.phone, perfil: member.profile, ativo: member.active ? 'TRUE' : 'FALSE',
        bio: member.bio, instagram: member.instagram, data_nascimento: member.birthDate,
        criado_em: member.joinedAt, created_at: member.joinedAt, created_by: member.createdBy, cidade: member.city, estado: member.state,
        dons: member.gifts.join(', '), formador: member.formator, atualizado_em: member.updatedAt, updated_at: member.updatedAt, updated_by: member.updatedBy, deleted_at:'', deleted_by:'',
      });
    }
    this.membersCache = null;
    this.membersByEmail.clear();
    this.membersById.clear();
    return member;
  }

  async setMemberActive(id: string, active: boolean): Promise<MemberRow> {
    return this.updateMember(id, { active });
  }


  async softDeleteRecord(tab: SheetName, id: string, userId: string): Promise<void> {
    const rows = await this.read(tab);
    const row = rows.find((item) => item.id === id);
    if (!row) throw new NotFoundException('Registro não encontrado.');
    const now = new Date().toISOString();
    await this.updateRecord(tab, 'id', id, { ...row, ativo:'FALSE', deleted_at:now, deleted_by:userId, updated_at:now, updated_by:userId, atualizado_em:now });
    this.membersCache = null;
  }

  async restoreRecord(tab: SheetName, id: string, userId: string): Promise<void> {
    const rows = await this.read(tab);
    const row = rows.find((item) => item.id === id);
    if (!row) throw new NotFoundException('Registro não encontrado.');
    const now = new Date().toISOString();
    await this.updateRecord(tab, 'id', id, { ...row, ativo:'TRUE', deleted_at:'', deleted_by:'', updated_at:now, updated_by:userId, atualizado_em:now });
    this.membersCache = null;
  }

  async findActiveMemberByEmail(email: string): Promise<MemberRow | null> {
    const normalized = email.trim().toLowerCase();
    if (!this.membersByEmail.size) await this.listMembers();
    const member = this.membersByEmail.get(normalized);
    return member?.active ? member : null;
  }

  async findMemberById(id: string): Promise<MemberRow | null> {
    if (!this.membersById.size) await this.listMembers();
    return this.membersById.get(id) ?? null;
  }
}
