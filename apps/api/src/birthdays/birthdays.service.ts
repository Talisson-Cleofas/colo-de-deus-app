import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import type { SendBirthdayMessageDto } from './send-birthday-message.dto';
import type { BirthdayItem } from './birthdays.types';

const truthy = (value: string) => ['true','1','sim','ativo','yes'].includes((value || '').trim().toLowerCase());
const normalizeType = (value: string) => (value || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

@Injectable()
export class BirthdaysService {
  constructor(private readonly sheets: GoogleSheetsService, private readonly settings: SettingsService, private readonly notifications: NotificationsService) {}

  private parseBirthDate(value: string): { year: number; month: number; day: number } | null {
    const text = (value || '').trim();
    if (!text) return null;
    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
    const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (br) return { year: Number(br[3]), month: Number(br[2]), day: Number(br[1]) };
    return null;
  }

  private daysUntil(month: number, day: number, now: Date): number {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let target = new Date(now.getFullYear(), month - 1, day);
    if (target < start) target = new Date(now.getFullYear() + 1, month - 1, day);
    return Math.round((target.getTime() - start.getTime()) / 86400000);
  }

  async list(query: { month?: string; search?: string; ministryId?: string; cellId?: string; cenacleId?: string }) {
    const publicSettings = await this.settings.getPublic();
    if (!publicSettings.birthdaysEnabled) {
      return { enabled: false, showAge: publicSettings.showBirthdayAge, selectedMonth: Number(query.month) || new Date().getMonth() + 1, today: [], upcoming: [], birthdays: [], options: { ministries: [], cells: [], cenacles: [] } };
    }

    const [members, participants, ministries, cells, cenacles] = await Promise.all([
      this.sheets.read('Membros'), this.sheets.read('Participantes'), this.sheets.read('Ministérios'), this.sheets.read('Células'), this.sheets.read('Cenáculos'),
    ]);
    const now = new Date();
    const selectedMonth = Math.min(12, Math.max(1, Number(query.month) || now.getMonth() + 1));
    const search = (query.search || '').trim().toLocaleLowerCase('pt-BR');
    const nameMap = (rows: Record<string,string>[]) => new Map(rows.map((r) => [r.id, r.nome || 'Sem nome']));
    const ministryNames = nameMap(ministries), cellNames = nameMap(cells), cenacleNames = nameMap(cenacles);

    const links = new Map<string, { ministryIds: string[]; cellIds: string[]; cenacleIds: string[] }>();
    for (const p of participants) {
      if (!truthy(p.ativo || 'true')) continue;
      const memberId = p.membro_id;
      if (!memberId) continue;
      const current = links.get(memberId) || { ministryIds: [], cellIds: [], cenacleIds: [] };
      const type = normalizeType(p.tipo);
      if (type.includes('MINISTER')) current.ministryIds.push(p.referencia_id);
      else if (type.includes('CELUL')) current.cellIds.push(p.referencia_id);
      else if (type.includes('CENAC')) current.cenacleIds.push(p.referencia_id);
      links.set(memberId, current);
    }

    const all: BirthdayItem[] = members.flatMap((member) => {
      if (!truthy(member.ativo || 'true')) return [];
      const birth = this.parseBirthDate(member.data_nascimento);
      if (!birth) return [];
      const memberLinks = links.get(member.id) || { ministryIds: [], cellIds: [], cenacleIds: [] };
      if (member.ministerio && !memberLinks.ministryIds.length) {
        const found = ministries.find((m) => (m.nome || '').trim() === member.ministerio.trim());
        if (found) memberLinks.ministryIds.push(found.id);
      }
      if (member.celula && !memberLinks.cellIds.length) {
        const found = cells.find((c) => (c.nome || '').trim() === member.celula.trim());
        if (found) memberLinks.cellIds.push(found.id);
      }
      const daysUntil = this.daysUntil(birth.month, birth.day, now);
      const age = now.getFullYear() - birth.year - ((now.getMonth() + 1 < birth.month || (now.getMonth() + 1 === birth.month && now.getDate() < birth.day)) ? 1 : 0);
      return [{
        id: member.id, name: member.nome || 'Membro', photo: member.foto || '', day: birth.day, month: birth.month,
        ...(publicSettings.showBirthdayAge ? { age } : {}), isToday: daysUntil === 0, daysUntil,
        city: member.cidade || '', state: member.estado || '',
        ministryIds: [...new Set(memberLinks.ministryIds)], ministryNames: [...new Set(memberLinks.ministryIds.map((id) => ministryNames.get(id)).filter(Boolean) as string[])],
        cellIds: [...new Set(memberLinks.cellIds)], cellNames: [...new Set(memberLinks.cellIds.map((id) => cellNames.get(id)).filter(Boolean) as string[])],
        cenacleIds: [...new Set(memberLinks.cenacleIds)], cenacleNames: [...new Set(memberLinks.cenacleIds.map((id) => cenacleNames.get(id)).filter(Boolean) as string[])],
      }];
    });

    const filtered = all.filter((item) => item.month === selectedMonth)
      .filter((item) => !search || item.name.toLocaleLowerCase('pt-BR').includes(search))
      .filter((item) => !query.ministryId || item.ministryIds.includes(query.ministryId))
      .filter((item) => !query.cellId || item.cellIds.includes(query.cellId))
      .filter((item) => !query.cenacleId || item.cenacleIds.includes(query.cenacleId))
      .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, 'pt-BR'));

    return {
      enabled: true,
      showAge: publicSettings.showBirthdayAge,
      selectedMonth,
      today: all.filter((item) => item.isToday).sort((a,b) => a.name.localeCompare(b.name, 'pt-BR')),
      upcoming: all.filter((item) => item.daysUntil > 0).sort((a,b) => a.daysUntil - b.daysUntil).slice(0, 8),
      birthdays: filtered,
      options: {
        ministries: ministries.filter((x) => truthy(x.ativo || 'true')).map((x) => ({ id: x.id, name: x.nome })).sort((a,b) => a.name.localeCompare(b.name,'pt-BR')),
        cells: cells.filter((x) => truthy(x.ativo || 'true')).map((x) => ({ id: x.id, name: x.nome })).sort((a,b) => a.name.localeCompare(b.name,'pt-BR')),
        cenacles: cenacles.filter((x) => truthy(x.ativo || 'true')).map((x) => ({ id: x.id, name: x.nome })).sort((a,b) => a.name.localeCompare(b.name,'pt-BR')),
      },
    };
  }

  async dashboard() {
    const data = await this.list({ month: String(new Date().getMonth() + 1) });
    return {
      enabled: data.enabled,
      today: data.today,
      week: [...data.today, ...data.upcoming.filter((item) => item.daysUntil <= 7)].slice(0, 12),
      month: data.birthdays.slice(0, 12),
      monthCount: data.birthdays.length,
    };
  }

  async history(user: AuthenticatedUser) {
    if (!['DEVELOPER','ADMIN','MINISTRY_LEADER','CELL_LEADER'].includes(user.profile)) throw new ForbiddenException('Acesso restrito ao histórico de aniversários.');
    const [notifications, deliveries] = await Promise.all([this.sheets.read('Notificações'), this.sheets.read('NotificacoesEntregas')]);
    const items: Array<Record<string, string | number>> = notifications.filter((row) => row.tipo === 'ANIVERSARIO')
      .map((row) => ({ ...row, deliveries: deliveries.filter((delivery) => delivery.notificacao_id === row.id).length } as Record<string, string | number>))
      .sort((a,b) => String(b.data_envio || b.criado_em || '').localeCompare(String(a.data_envio || a.criado_em || '')));
    return { items };
  }

  async sendMessage(memberId: string, dto: SendBirthdayMessageDto, user: AuthenticatedUser) {
    if (!['DEVELOPER','ADMIN','MINISTRY_LEADER','CELL_LEADER'].includes(user.profile)) throw new ForbiddenException('Você não possui permissão para enviar mensagens de aniversário.');
    const members = await this.sheets.read('Membros');
    const member = members.find((item) => item.id === memberId);
    if (!member) throw new NotFoundException('Membro não encontrado.');
    const leaders = members.filter((item) => ['DEVELOPER','ADMIN','MINISTRY_LEADER','CELL_LEADER'].includes((item.perfil || '').trim().toUpperCase())).map((item) => item.id).filter(Boolean);
    const audience = dto.audience || 'ALL';
    return this.notifications.create({
      title: `Mensagem de aniversário para ${member.nome || 'membro'}`,
      message: dto.message.replaceAll('{nome}', member.nome || 'Membro'),
      type: 'ANIVERSARIO',
      audience: audience === 'LEADERS' ? 'INDIVIDUAL' : 'TODOS',
      recipientIds: audience === 'LEADERS' ? leaders : undefined,
      origin: 'Aniversários', referenceType: 'MEMBRO', referenceId: member.id, link: `/membros/${member.id}`,
    }, user);
  }

}
