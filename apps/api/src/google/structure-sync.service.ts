import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GoogleSheetsService, type SheetRecord } from './google-sheets.service';

type StructureType = 'MINISTERIO' | 'CELULA' | 'CENACULO';
type StructureTab = 'Ministérios' | 'Células' | 'Cenáculos';

@Injectable()
export class StructureSyncService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  private active(value: string): boolean {
    return !value || this.sheets.parseActive(value, true);
  }

  private definition(type: StructureType) {
    if (type === 'MINISTERIO') return { tab: 'Ministérios' as StructureTab, primary: 'lider_id', secondary: 'vice_lider_id', primaryRole: 'LIDER', secondaryRole: 'VICE_LIDER' };
    if (type === 'CELULA') return { tab: 'Células' as StructureTab, primary: 'lider_id', secondary: 'vice_lider_id', primaryRole: 'LIDER', secondaryRole: 'VICE_LIDER' };
    return { tab: 'Cenáculos' as StructureTab, primary: 'responsavel_id', secondary: 'vice_responsavel_id', primaryRole: 'RESPONSAVEL', secondaryRole: 'VICE_RESPONSAVEL' };
  }

  /**
   * Mantém a aba Participantes coerente com os campos oficiais de liderança.
   * Em caso de falha, restaura os registros afetados (transação lógica compensatória).
   */
  async reconcileStructure(type: StructureType, structureId: string): Promise<void> {
    const def = this.definition(type);
    const [structures, participants] = await Promise.all([this.sheets.read(def.tab), this.sheets.read('Participantes')]);
    const structure = structures.find((row) => row.id === structureId);
    if (!structure) return;

    const affected = participants.filter((row) => row.tipo === type && row.referencia_id === structureId);
    const expected = new Map<string, string>();
    if (structure[def.primary]) expected.set(structure[def.primary], def.primaryRole);
    if (structure[def.secondary]) expected.set(structure[def.secondary], def.secondaryRole);
    const now = new Date().toISOString();
    const touched: Array<{ before: SheetRecord; created?: boolean }> = [];

    try {
      for (const row of affected) {
        const expectedRole = expected.get(row.membro_id);
        const isLeadership = [def.primaryRole, def.secondaryRole, 'LIDER', 'VICE_LIDER', 'RESPONSAVEL', 'VICE_RESPONSAVEL'].includes((row.funcao || '').toUpperCase());
        if (expectedRole) {
          touched.push({ before: { ...row } });
          await this.sheets.updateRecord('Participantes', 'id', row.id, {
            ...row, funcao: expectedRole, ativo: 'TRUE', data_saida: '', atualizado_em: now,
          });
          expected.delete(row.membro_id);
        } else if (isLeadership && this.active(row.ativo || '')) {
          touched.push({ before: { ...row } });
          await this.sheets.updateRecord('Participantes', 'id', row.id, {
            ...row, ativo: 'FALSE', data_saida: now.slice(0, 10), atualizado_em: now,
          });
        }
      }

      for (const [memberId, role] of expected) {
        const id = randomUUID();
        const record = { id, membro_id: memberId, tipo: type, referencia_id: structureId, funcao: role, data_entrada: now.slice(0, 10), data_saida: '', ativo: 'TRUE', criado_em: now, atualizado_em: now };
        await this.sheets.appendRecord('Participantes', record);
        touched.push({ before: record, created: true });
      }

      const memberIds = new Set([...affected.map((row) => row.membro_id), ...Array.from(expected.keys()), structure[def.primary], structure[def.secondary]].filter(Boolean));
      for (const memberId of memberIds) await this.syncMemberSummary(memberId);
    } catch (error) {
      for (const item of touched.reverse()) {
        try {
          if (item.created) {
            await this.sheets.updateRecord('Participantes', 'id', item.before.id, { ...item.before, ativo: 'FALSE', data_saida: now.slice(0, 10), atualizado_em: now });
          } else {
            await this.sheets.updateRecord('Participantes', 'id', item.before.id, item.before);
          }
        } catch { /* preserva o erro original */ }
      }
      throw new ServiceUnavailableException(`Não foi possível sincronizar os vínculos de ${def.tab}.`, { cause: error as Error });
    }
  }

  async syncMemberSummary(memberId: string): Promise<void> {
    const [members, participants, ministries, cells] = await Promise.all([
      this.sheets.listMembers(true), this.sheets.read('Participantes'), this.sheets.read('Ministérios'), this.sheets.read('Células'),
    ]);
    const member = members.find((item) => item.id === memberId);
    if (!member) return;
    const links = participants.filter((row) => row.membro_id === memberId && this.active(row.ativo || ''));
    const ministryIds = new Set(links.filter((row) => row.tipo === 'MINISTERIO').map((row) => row.referencia_id));
    const cellIds = new Set(links.filter((row) => row.tipo === 'CELULA').map((row) => row.referencia_id));
    ministries.filter((row) => row.lider_id === memberId || row.vice_lider_id === memberId).forEach((row) => ministryIds.add(row.id));
    cells.filter((row) => row.lider_id === memberId || row.vice_lider_id === memberId).forEach((row) => cellIds.add(row.id));
    const ministry = ministries.find((row) => ministryIds.has(row.id))?.nome || '';
    const cell = cells.find((row) => cellIds.has(row.id))?.nome || '';
    if (member.ministry !== ministry || member.cell !== cell) await this.sheets.updateMember(memberId, { ministry, cell });
  }

  async reconcileAll(): Promise<{ ministries: number; cells: number; cenacles: number }> {
    const [ministries, cells, cenacles] = await Promise.all([this.sheets.read('Ministérios'), this.sheets.read('Células'), this.sheets.read('Cenáculos')]);
    for (const row of ministries) await this.reconcileStructure('MINISTERIO', row.id);
    for (const row of cells) await this.reconcileStructure('CELULA', row.id);
    for (const row of cenacles) await this.reconcileStructure('CENACULO', row.id);
    return { ministries: ministries.length, cells: cells.length, cenacles: cenacles.length };
  }
}
