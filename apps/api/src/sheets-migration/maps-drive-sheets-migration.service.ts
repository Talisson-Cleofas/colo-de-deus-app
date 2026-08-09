import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { SHEET_SCHEMAS, type SheetName } from '../google/sheet-schemas';

const TARGET_VERSION = '4.2.2';
const NEW_TABS: SheetName[] = [
  'Arquivos',
  'PastasDrive',
  'HistoricoArquivos',
  'Sistema',
  'Migracoes',
];

export type MigrationPreview = {
  currentVersion: string;
  targetVersion: string;
  demoMode: boolean;
  missingSheets: string[];
  missingColumns: Record<string, string[]>;
  changesRequired: boolean;
};

@Injectable()
export class MapsDriveSheetsMigrationService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  private async currentVersion(): Promise<string> {
    if (this.sheets.isDemo()) return 'demo';
    try {
      const rows = await this.sheets.readRows('Sistema!A:D');
      return rows[1]?.[0]?.trim() || 'anterior-a-4.2.2';
    } catch {
      return 'anterior-a-4.2.2';
    }
  }

  async preview(): Promise<MigrationPreview> {
    const status = await this.sheets.schemaStatus();
    const byTab = new Map(status.map((item) => [item.tab, item]));
    const missingSheets: string[] = [];
    const missingColumns: Record<string, string[]> = {};

    for (const [tab, expected] of Object.entries(SHEET_SCHEMAS)) {
      const current = byTab.get(tab)?.current ?? [];
      if (!current.length && NEW_TABS.includes(tab as SheetName)) missingSheets.push(tab);
      const missing = expected.filter(
        (header) => !current.some((value) => value.trim() === header),
      );
      if (missing.length) missingColumns[tab] = [...missing];
    }

    return {
      currentVersion: await this.currentVersion(),
      targetVersion: TARGET_VERSION,
      demoMode: this.sheets.isDemo(),
      missingSheets,
      missingColumns,
      changesRequired: missingSheets.length > 0 || Object.keys(missingColumns).length > 0,
    };
  }

  private async appendMissingColumns(tab: SheetName): Promise<string[]> {
    const expected = SHEET_SCHEMAS[tab];
    await this.sheets.ensureTab(tab, expected);
    if (this.sheets.isDemo()) return [];
    const rows = await this.sheets.readRows(`${tab}!1:1`);
    const current = (rows[0] ?? []).map((value) => value.trim()).filter(Boolean);
    const missing = expected.filter((header) => !current.includes(header));
    if (!missing.length) return [];
    const merged = [...current, ...missing];
    await this.sheets.updateRows(`${tab}!A1:${this.columnName(merged.length)}1`, [merged]);
    return [...missing];
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

  async run(user = 'system') {
    const startedAt = new Date().toISOString();
    const before = await this.preview();
    const createdSheets: string[] = [];
    const columnsAdded: Record<string, string[]> = {};

    if (!this.sheets.isDemo()) {
      for (const tab of Object.keys(SHEET_SCHEMAS) as SheetName[]) {
        const wasMissing = before.missingSheets.includes(tab);
        const added = await this.appendMissingColumns(tab);
        if (wasMissing) createdSheets.push(tab);
        if (added.length) columnsAdded[tab] = added;
      }

      const finishedAt = new Date().toISOString();
      await this.sheets.updateRows('Sistema!A1:D2', [
        [...SHEET_SCHEMAS.Sistema],
        [TARGET_VERSION, TARGET_VERSION, finishedAt, 'OK'],
      ]);
      await this.sheets.appendRecord('Migracoes', {
        id: randomUUID(),
        versao: TARGET_VERSION,
        usuario: user,
        inicio: startedAt,
        fim: finishedAt,
        status: 'OK',
        detalhes: JSON.stringify({ createdSheets, columnsAdded }),
      });
    }

    return {
      success: true,
      demoMode: this.sheets.isDemo(),
      version: TARGET_VERSION,
      createdSheets,
      columnsAdded,
      preservedExistingData: true,
      idempotent: true,
      executedAt: new Date().toISOString(),
    };
  }

  async status() {
    const preview = await this.preview();
    return {
      version: preview.currentVersion,
      targetVersion: TARGET_VERSION,
      migrated: !preview.changesRequired && preview.currentVersion === TARGET_VERSION,
      pendingChanges: preview.missingColumns,
      missingSheets: preview.missingSheets,
      demoMode: preview.demoMode,
    };
  }
}
