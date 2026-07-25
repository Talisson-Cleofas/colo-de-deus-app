import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import type { SheetRecord } from '../google/google-sheets.service';
import { NOTIFICATION_REPOSITORY, type INotificationRepository } from '../persistence/interfaces/notification-repository.interface';
import { NotificationDateNormalizer } from './notification-date-normalizer.service';
import type { NotificationItem, NotificationPreferences } from './notifications.types';
import { NotificationSheetValidator } from './notification-sheet-validator.service';
const truthy = (value: string | undefined) =>
  ['TRUE', '1', 'SIM', 'YES'].includes((value || '').trim().toUpperCase());
export type NotificationState = {
  notifications: NotificationItem[];
  items: NotificationItem[];
  unreadCount: number;
  readCount: number;
  total: number;
  updatedAt: string;
};
@Injectable()
export class NotificationReadEngine {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly sheets: INotificationRepository,
    private readonly dates: NotificationDateNormalizer,
    private readonly validator: NotificationSheetValidator,
  ) {}
  memberId(user: AuthenticatedUser): string {
    return user.memberId || user.id || user.uid;
  }
  private async rows(tab: string): Promise<SheetRecord[]> {
    if (this.sheets.isDemo()) return [];
    return this.sheets.read(tab);
  }
  private categoryEnabled(type: string, preferences: NotificationPreferences): boolean {
    if (type === 'EVENTO') return preferences.events;
    if (type === 'JUSTIFICATIVA') return preferences.justifications;
    if (type === 'ANIVERSARIO') return preferences.birthdays;
    if (type === 'MEMBRO') return preferences.memberships;
    return true;
  }
  private accessible(row: SheetRecord, user: AuthenticatedUser): boolean {
    if (['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile)) return true;
    const memberId = this.memberId(user);
    const audience = (row.publico || 'TODOS').trim().toUpperCase();
    const audienceId = (row.publico_id || '').trim();
    if (audience === 'TODOS') return true;
    if (audience === 'PERFIL') return audienceId === user.profile;
    if (audience === 'INDIVIDUAL') {
      return (row.destinatarios || row.destinatario_id || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .includes(memberId);
    }
    if (audience === 'MINISTERIO') return audienceId === user.ministry;
    if (audience === 'CELULA') return audienceId === user.cell;
    if (audience === 'CENACULO') return true;
    return false;
  }
  private latestRead(reads: SheetRecord[], notificationId: string, memberId: string): SheetRecord | undefined {
    return reads
      .filter((row) => row.notificacao_id === notificationId && row.membro_id === memberId)
      .sort((a, b) => {
        const aTime = this.dates.timestamp(a.atualizado_em || a.data_leitura || a.lida_em) ?? 0;
        const bTime = this.dates.timestamp(b.atualizado_em || b.data_leitura || b.lida_em) ?? 0;
        return bTime - aTime;
      })[0];
  }
  private map(row: SheetRecord, reads: SheetRecord[], user: AuthenticatedUser): NotificationItem {
    const memberId = this.memberId(user);
    const read = this.latestRead(reads, row.id || '', memberId);
    const readDate = read?.data_leitura || read?.lida_em;
    return {
      id: row.id || '',
      title: row.titulo || '',
      message: row.mensagem || '',
      type: row.tipo || 'INFO',
      audience: row.publico || 'TODOS',
      audienceId: row.publico_id || '',
      origin: row.origem || '',
      referenceType: row.referencia_tipo || '',
      referenceId: row.referencia_id || '',
      link: row.link || '',
      senderId: row.enviado_por || '',
      senderName: row.enviado_por_nome || '',
      sentAt: this.dates.toIso(row.data_envio || row.criado_em, `Notificações:${row.id}:data_envio`),
      // Ausência de linha em NotificacoesLeituras significa não lida.
      read: truthy(read?.lida),
      readAt: this.dates.toIso(readDate, `NotificacoesLeituras:${read?.id || row.id}:data_leitura`),
      active: !row.ativo || truthy(row.ativo),
      canDelete: ['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile) || row.enviado_por === memberId,
    };
  }
  async state(user: AuthenticatedUser, preferences: NotificationPreferences): Promise<NotificationState> {
    const [catalog, reads] = await Promise.all([
      this.rows('Notificações').then((rows) => this.validator.normalizeMany(rows)),
      this.rows('NotificacoesLeituras'),
    ]);
    const notifications = catalog
      .filter((row) => (!row.ativo || truthy(row.ativo)))
      .filter((row) => this.accessible(row, user))
      .filter((row) => this.categoryEnabled(row.tipo || '', preferences))
      .map((row) => this.map(row, reads, user))
      .sort(
        (a, b) =>
          (this.dates.timestamp(b.sentAt) ?? Number.NEGATIVE_INFINITY) -
          (this.dates.timestamp(a.sentAt) ?? Number.NEGATIVE_INFINITY),
      );
    const unreadCount = notifications.filter((item) => !item.read).length;
    return {
      notifications,
      items: notifications,
      unreadCount,
      readCount: notifications.length - unreadCount,
      total: notifications.length,
      updatedAt: new Date().toISOString(),
    };
  }
}
