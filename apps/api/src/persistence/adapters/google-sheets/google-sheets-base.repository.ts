import { Injectable } from '@nestjs/common';
import type { CreateMemberInput, MemberRow, SheetRecord } from '../../../google/google-sheets.service';
import { GoogleSheetsService } from '../../../google/google-sheets.service';
import type { SheetName } from '../../../google/sheet-schemas';
import type { IBaseRepository } from '../../interfaces/base-repository.interface';
import type { PaginatedResult, QueryOptions } from '../../types/query-options';
import type { Specification } from '../../specifications/specification';

@Injectable()
export class GoogleSheetsBaseRepository implements IBaseRepository {
  constructor(protected readonly sheets: GoogleSheetsService) {}
  isDemo(): boolean { return this.sheets.isDemo(); }
  schemas(): unknown { return this.sheets.schemas(); }
  read(tab: string): Promise<SheetRecord[]> { return this.sheets.read(tab); }
  ensureTab(tab: string, headers: readonly string[]): Promise<{ created: boolean; addedColumns: string[] }> { return this.sheets.ensureTab(tab, headers); }
  ensureAllTabs(): Promise<Array<{ tab: string; created: boolean; addedColumns: string[] }>> { return this.sheets.ensureAllTabs(); }
  schemaStatus(forceRefresh = false): Promise<Array<{ tab: string; expected: readonly string[]; current: string[]; valid: boolean }>> { return this.sheets.schemaStatus(forceRefresh); }
  migrateTabSchema(tab: SheetName, aliases: Record<string, string> = {}): Promise<boolean> { return this.sheets.migrateTabSchema(tab, aliases); }
  readIndexed(tab: string, idHeader = 'id'): Promise<Map<string, SheetRecord>> { return this.sheets.readIndexed(tab, idHeader); }
  findRecordById(tab: string, id: string, idHeader = 'id'): Promise<SheetRecord | null> { return this.sheets.findRecordById(tab, id, idHeader); }
  appendRecord(tab: SheetName, record: Record<string, string | number | boolean>): Promise<void> { return this.sheets.appendRecord(tab, record); }
  updateRecord(tab: SheetName, idHeader: string, idValue: string, record: Record<string, string | number | boolean>): Promise<void> { return this.sheets.updateRecord(tab, idHeader, idValue, record); }
  replaceRecords(tab: SheetName, records: Array<Record<string, string | number | boolean>>): Promise<void> { return this.sheets.replaceRecords(tab, records); }
  parseActive(value: string, defaultValue = false): boolean { return this.sheets.parseActive(value, defaultValue); }
  listMembers(forceRefresh = false): Promise<MemberRow[]> { return this.sheets.listMembers(forceRefresh); }
  findActiveMemberByEmail(email: string): Promise<MemberRow | null> { return this.sheets.findActiveMemberByEmail(email); }
  findMemberById(id: string): Promise<MemberRow | null> { return this.sheets.findMemberById(id); }
  createMember(input: CreateMemberInput): Promise<MemberRow> { return this.sheets.createMember(input); }
  updateMember(id: string, input: Partial<CreateMemberInput>): Promise<MemberRow> { return this.sheets.updateMember(id, input); }
  setMemberActive(id: string, active: boolean): Promise<MemberRow> { return this.sheets.setMemberActive(id, active); }
  softDeleteRecord(tab: SheetName, id: string, userId: string): Promise<void> { return this.sheets.softDeleteRecord(tab, id, userId); }
  restoreRecord(tab: SheetName, id: string, userId: string): Promise<void> { return this.sheets.restoreRecord(tab, id, userId); }

  async findAll<T extends SheetRecord>(tab: string, options: QueryOptions<T> = {}, specification?: Specification<T>): Promise<PaginatedResult<T>> {
    let rows = (await this.read(tab)) as T[];
    if (specification) rows = rows.filter((row) => specification.isSatisfiedBy(row));
    if (options.filters) {
      rows = rows.filter((row) => Object.entries(options.filters ?? {}).every(([key, expected]) => {
        if (expected === undefined) return true;
        const actual = row[key];
        return Array.isArray(expected) ? expected.map(String).includes(String(actual)) : String(actual) === String(expected);
      }));
    }
    if (options.orderBy) {
      const key = options.orderBy;
      const direction = options.direction === 'desc' ? -1 : 1;
      rows = [...rows].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * direction);
    }
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(500, Math.max(1, options.limit ?? 50));
    const total = rows.length;
    return { data: rows.slice((page - 1) * limit, page * limit), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }
}
