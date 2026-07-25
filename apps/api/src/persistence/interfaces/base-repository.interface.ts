import type { CreateMemberInput, MemberRow, SheetRecord } from '../../google/google-sheets.service';
import type { SheetName } from '../../google/sheet-schemas';
import type { PaginatedResult, QueryOptions } from '../types/query-options';
import type { Specification } from '../specifications/specification';

export interface IBaseRepository {
  isDemo(): boolean;
  schemas(): unknown;
  read(tab: string): Promise<SheetRecord[]>;
  ensureTab(tab: string, headers: readonly string[]): Promise<{ created: boolean; addedColumns: string[] }>;
  ensureAllTabs(): Promise<Array<{ tab: string; created: boolean; addedColumns: string[] }>>;
  schemaStatus(forceRefresh?: boolean): Promise<Array<{ tab: string; expected: readonly string[]; current: string[]; valid: boolean }>>;
  migrateTabSchema(tab: SheetName, aliases?: Record<string, string>): Promise<boolean>;
  readIndexed(tab: string, idHeader?: string): Promise<Map<string, SheetRecord>>;
  findRecordById(tab: string, id: string, idHeader?: string): Promise<SheetRecord | null>;
  appendRecord(tab: SheetName, record: Record<string, string | number | boolean>): Promise<void>;
  updateRecord(tab: SheetName, idHeader: string, idValue: string, record: Record<string, string | number | boolean>): Promise<void>;
  replaceRecords(tab: SheetName, records: Array<Record<string, string | number | boolean>>): Promise<void>;
  parseActive(value: string, defaultValue?: boolean): boolean;
  findAll<T extends SheetRecord>(tab: string, options?: QueryOptions<T>, specification?: Specification<T>): Promise<PaginatedResult<T>>;
  listMembers(forceRefresh?: boolean): Promise<MemberRow[]>;
  findActiveMemberByEmail(email: string): Promise<MemberRow | null>;
  findMemberById(id: string): Promise<MemberRow | null>;
  createMember(input: CreateMemberInput): Promise<MemberRow>;
  updateMember(id: string, input: Partial<CreateMemberInput>): Promise<MemberRow>;
  setMemberActive(id: string, active: boolean): Promise<MemberRow>;
  softDeleteRecord(tab: SheetName, id: string, userId: string): Promise<void>;
  restoreRecord(tab: SheetName, id: string, userId: string): Promise<void>;
}
