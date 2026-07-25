import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GoogleSheetsService } from '../google/google-sheets.service';

export type IntegrationConfigRecord = {
  id: string; module: string; key: string; value: string; type: string;
  description: string; active: boolean; updatedAt: string;
};

@Injectable()
export class IntegrationConfigService {
  private demo = new Map<string, IntegrationConfigRecord>();
  constructor(private readonly sheets: GoogleSheetsService) {}

  private composite(module: string, key: string) { return `${module.trim().toUpperCase()}::${key.trim().toUpperCase()}`; }

  async list(module?: string): Promise<IntegrationConfigRecord[]> {
    const records = this.sheets.isDemo() ? [...this.demo.values()] : (await this.sheets.read('Integracoes')).map(row => ({
      id: row.id || '', module: row.modulo || '', key: row.chave || '', value: row.valor || '', type: row.tipo || 'STRING',
      description: row.descricao || '', active: this.sheets.parseActive(row.ativo || '', true), updatedAt: row.atualizado_em || '',
    }));
    return records.filter(item => !module || item.module.toUpperCase() === module.toUpperCase()).sort((a,b)=>a.key.localeCompare(b.key));
  }

  async getValue(module: string, key: string): Promise<string | undefined> {
    return (await this.list(module)).find(item => item.key.toUpperCase() === key.toUpperCase() && item.active)?.value;
  }

  async upsert(module: string, key: string, value: string, options: { type?: string; description?: string; active?: boolean } = {}): Promise<IntegrationConfigRecord> {
    const current = (await this.list(module)).find(item => item.key.toUpperCase() === key.toUpperCase());
    const record: IntegrationConfigRecord = {
      id: current?.id || randomUUID(), module, key, value, type: options.type || current?.type || 'STRING',
      description: options.description ?? current?.description ?? '', active: options.active ?? current?.active ?? true,
      updatedAt: new Date().toISOString(),
    };
    if (this.sheets.isDemo()) this.demo.set(this.composite(module,key), record);
    else {
      const row = { id:record.id, modulo:record.module, chave:record.key, valor:record.value, tipo:record.type, descricao:record.description, ativo:record.active, atualizado_em:record.updatedAt };
      if (current) await this.sheets.updateRecord('Integracoes','id',record.id,row); else await this.sheets.appendRecord('Integracoes',row);
    }
    return record;
  }
}
