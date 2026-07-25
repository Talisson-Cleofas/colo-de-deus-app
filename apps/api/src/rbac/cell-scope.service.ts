import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { GoogleSheetsService } from '../google/google-sheets.service';

const normalize = (value = '') => value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

@Injectable()
export class CellScopeService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  isCellLeader(user?: AuthenticatedUser): boolean {
    return user?.profile === 'CELL_LEADER';
  }

  async isCellsMinistryLeader(user?: AuthenticatedUser): Promise<boolean> {
    if (!user || user.profile !== 'MINISTRY_LEADER') return false;
    const uid = user.memberId || user.id;
    const ministries = await this.sheets.read('Ministérios');
    return ministries.some((row) => {
      const owned = row.lider_id === uid || row.vice_lider_id === uid;
      const identity = normalize(`${row.nome || ''} ${row.codigo || ''} ${row.slug || ''}`);
      return owned && (identity.includes('CELULAS') || identity.includes('CELULA'));
    });
  }

  async cellIds(user: AuthenticatedUser): Promise<Set<string>> {
    if (await this.isCellsMinistryLeader(user)) {
      return new Set((await this.sheets.read('Células')).map((row) => row.id).filter(Boolean));
    }
    if (!this.isCellLeader(user)) return new Set();
    const uid = user.memberId || user.id;
    const [cells, links] = await Promise.all([this.sheets.read('Células'), this.sheets.read('Participantes')]);
    const ids = new Set<string>();
    cells.forEach((row) => {
      const sameName = Boolean(user.cell && normalize(row.nome) === normalize(user.cell));
      if (row.lider_id === uid || row.vice_lider_id === uid || sameName) ids.add(row.id);
    });
    links
      .filter((row) => row.tipo === 'CELULA' && row.membro_id === uid && this.sheets.parseActive(row.ativo || '', true))
      .filter((row) => ['LIDER', 'VICE_LIDER', 'RESPONSAVEL'].includes(normalize(row.funcao).replace(/ /g, '_')))
      .forEach((row) => ids.add(row.referencia_id));
    return ids;
  }

  async canAccessCell(user: AuthenticatedUser, cellId?: string): Promise<boolean> {
    if (!this.isCellLeader(user) && !(await this.isCellsMinistryLeader(user))) return true;
    return Boolean(cellId && (await this.cellIds(user)).has(cellId));
  }

  async resourceCellId(id: string): Promise<string> {
    if (!id) return '';
    const cell = (await this.sheets.read('Células')).find((row) => row.id === id);
    if (cell) return cell.id;
    const cenacle = (await this.sheets.read('Cenáculos')).find((row) => row.id === id);
    if (cenacle) return cenacle.celula_id || '';
    const event = (await this.sheets.read('Eventos')).find((row) => row.id === id);
    return event?.celula_id || event?.cell_id || '';
  }
}
