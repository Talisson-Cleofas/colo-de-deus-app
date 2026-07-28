import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { normalizeMinistryModule, type MinistryModuleCode } from './ministry-permission.map';

@Injectable()
export class MinistryModuleService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  async modulesForUser(user: AuthenticatedUser): Promise<MinistryModuleCode[]> {
    if (['DEVELOPER', 'ADMIN', 'MISSION_LEADER'].includes(user.profile)) {
      return ['CELULAS', 'EVENTOS', 'CENACULO', 'FINANCAS', 'COMUNICACAO'];
    }
    if (user.profile !== 'MINISTRY_LEADER') return [];
    const memberId = user.memberId || user.id;
    const rows = await this.sheets.read('Ministérios');
    const modules = rows
      .filter((row) => row.lider_id === memberId || row.vice_lider_id === memberId || (!!user.ministry && row.nome === user.ministry))
      .map((row) => normalizeMinistryModule(row.codigo || row.code || row.tipo || row.nome || ''))
      .filter((value): value is MinistryModuleCode => Boolean(value));
    return [...new Set(modules)];
  }

  async accepts(user: AuthenticatedUser, module: MinistryModuleCode): Promise<boolean> {
    if (['DEVELOPER', 'ADMIN', 'MISSION_LEADER'].includes(user.profile)) return true;
    if (user.profile !== 'MINISTRY_LEADER') return true;
    return (await this.modulesForUser(user)).includes(module);
  }
}
