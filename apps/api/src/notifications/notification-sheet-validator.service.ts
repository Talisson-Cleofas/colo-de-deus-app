import { Injectable, Logger } from '@nestjs/common';
import type { SheetRecord } from '../google/google-sheets.service';
import { NotificationDateNormalizer } from './notification-date-normalizer.service';

@Injectable()
export class NotificationSheetValidator {
  private readonly logger = new Logger(NotificationSheetValidator.name);
  constructor(private readonly dates: NotificationDateNormalizer) {}

  normalize(row: SheetRecord): SheetRecord {
    const normalized: SheetRecord = { ...row };
    const id = row.id || 'sem-id';
    const channelInDate = ['APP', 'PUSH', 'EMAIL', 'WHATSAPP'].includes((row.data_envio || '').trim().toUpperCase());

    if (channelInDate) {
      this.logger.warn(`[NotificationSheetValidator] Notificações:${id}: valor de canal encontrado em data_envio. Aplicando correção em memória.`);
      normalized.canal = row.canal || row.data_envio;
      normalized.data_envio = this.dates.toIso(row.agendada_para || row.criado_em, `Notificações:${id}:data_envio`) || '';
      normalized.agendada_para = '';
    } else {
      normalized.canal = row.canal || 'APP';
      normalized.data_envio = this.dates.toIso(row.data_envio || row.criado_em, `Notificações:${id}:data_envio`) || '';
    }

    normalized.ativo = row.ativo === '' || row.ativo === undefined ? 'TRUE' : row.ativo;
    normalized.titulo = row.titulo || 'Notificação';
    normalized.mensagem = row.mensagem || '';
    return normalized;
  }

  normalizeMany(rows: SheetRecord[]): SheetRecord[] {
    return rows.map((row) => this.normalize(row));
  }
}
