import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { GoogleSheetsService } from '../google/google-sheets.service';

@Injectable()
export class MinistryScopeService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  isRestricted(user?: AuthenticatedUser): boolean {
    return user?.profile === 'MINISTRY_LEADER';
  }

  async ministryIds(user: AuthenticatedUser): Promise<Set<string>> {
    if (!this.isRestricted(user)) return new Set();
    const uid = user.memberId || user.id;
    const ministries = await this.sheets.read('Ministérios');
    const ids = ministries
      .filter((row) => row.lider_id === uid || row.vice_lider_id === uid || (!!user.ministry && row.nome === user.ministry))
      .map((row) => row.id)
      .filter(Boolean);
    return new Set(ids);
  }

  async acceptsMinistry(user: AuthenticatedUser, ministryId?: string): Promise<boolean> {
    if (!this.isRestricted(user)) return true;
    if (!ministryId) return false;
    return (await this.ministryIds(user)).has(ministryId);
  }

  async resourceMinistryId(kind: 'events'|'communities'|'members', id: string): Promise<string> {
    if (!id) return '';
    if (kind === 'events') return (await this.sheets.read('Eventos')).find((r) => r.id === id)?.ministerio_id || '';
    if (kind === 'communities') {
      const cell = (await this.sheets.read('Células')).find((r) => r.id === id);
      if (cell) return cell.ministerio_id || '';
      return (await this.sheets.read('Cenáculos')).find((r) => r.id === id)?.ministerio_id || '';
    }
    const [users, members, ministries, links] = await Promise.all([
      this.sheets.read('Usuarios'), this.sheets.listMembers(true), this.sheets.read('Ministérios'), this.sheets.read('Participantes'),
    ]);
    const direct = users.find((r) => r.membro_id === id || r.id === id)?.ministerio_id;
    if (direct) return direct;
    const link = links.find((r) => r.membro_id === id && r.tipo === 'MINISTERIO' && this.sheets.parseActive(r.ativo || '', true));
    if (link?.referencia_id) return link.referencia_id;
    const member = members.find((m) => m.id === id);
    return ministries.find((m) => m.nome === member?.ministry)?.id || '';
  }

  async memberIds(user: AuthenticatedUser): Promise<Set<string>> {
    if (!this.isRestricted(user)) return new Set();
    const ministryIds = await this.ministryIds(user);
    const [users, members, ministries, links] = await Promise.all([
      this.sheets.read('Usuarios'), this.sheets.listMembers(true), this.sheets.read('Ministérios'), this.sheets.read('Participantes'),
    ]);
    const names = new Set(ministries.filter((m) => ministryIds.has(m.id)).map((m) => m.nome));
    const ids = new Set<string>();
    users.filter((r) => ministryIds.has(r.ministerio_id)).forEach((r) => ids.add(r.membro_id || r.id));
    links.filter((r) => r.tipo === 'MINISTERIO' && ministryIds.has(r.referencia_id) && this.sheets.parseActive(r.ativo || '', true)).forEach((r) => ids.add(r.membro_id));
    members.filter((m) => names.has(m.ministry)).forEach((m) => ids.add(m.id));
    ids.add(user.memberId || user.id);
    return ids;
  }
}
