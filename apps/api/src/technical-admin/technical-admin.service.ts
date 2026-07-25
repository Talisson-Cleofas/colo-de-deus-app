import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { google } from 'googleapis';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { StructureSyncService } from '../google/structure-sync.service';
import type { IntegrationKey, IntegrationStatus, PermissionRecord } from './technical-admin.types';

@Injectable()
export class TechnicalAdminService {
  constructor(private readonly config: ConfigService, private readonly sheets: GoogleSheetsService, private readonly structureSync: StructureSyncService) {}

  private has(...keys: string[]) { return keys.every((key) => Boolean(this.config.get<string>(key)?.trim())); }
  private now() { return new Date().toISOString(); }
  private async log(level: 'INFO'|'ERROR', category: string, action: string, message: string, user?: AuthenticatedUser, details = '') {
    const now = this.now();
    try {
      await this.sheets.appendRecord('IntegracoesHistorico', {
        id: randomUUID(), nivel: level, categoria: category, acao: action, mensagem: message,
        detalhes: details, usuario_id: user?.memberId || user?.id || 'SYSTEM', usuario_email: user?.email || '', criado_em: now,
      });
    } catch { /* nunca interromper a operação por falha de auditoria */ }
  }

  private configuredStatus(key: IntegrationKey): IntegrationStatus {
    const at = this.now();
    const map: Record<IntegrationKey, IntegrationStatus> = {
      GOOGLE_SHEETS: { key, name: 'Google Sheets', configured: this.has('GOOGLE_SHEETS_ID') && (this.has('GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY') || this.has('FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY')), connected: null, message: '', lastCheckedAt: at },
      GOOGLE_DRIVE: { key, name: 'Google Drive', configured: this.has('GOOGLE_DRIVE_FOLDER_ID') && (this.has('GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY') || this.has('FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY')), connected: null, message: '', lastCheckedAt: at },
      FIREBASE: { key, name: 'Firebase', configured: this.has('FIREBASE_PROJECT_ID','FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY'), connected: null, message: '', lastCheckedAt: at },
      GOOGLE_MAPS: { key, name: 'Google Maps', configured: this.has('GOOGLE_MAPS_API_KEY') || this.has('VITE_GOOGLE_MAPS_API_KEY'), connected: null, message: '', lastCheckedAt: at },
      MERCADO_PAGO: { key, name: 'Mercado Pago', configured: this.has('MERCADO_PAGO_ACCESS_TOKEN') || this.has('MP_ACCESS_TOKEN'), connected: null, message: '', lastCheckedAt: at },
    };
    const item = map[key];
    item.message = item.configured ? 'Configurado. Credenciais protegidas e não exibidas.' : 'Não configurado.';
    return item;
  }

  async statuses(): Promise<IntegrationStatus[]> {
    return (['GOOGLE_SHEETS','GOOGLE_DRIVE','FIREBASE','GOOGLE_MAPS','MERCADO_PAGO'] as IntegrationKey[]).map((key) => this.configuredStatus(key));
  }

  private googleAuth(scopes: string[]) {
    const email = (this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL') || this.config.get<string>('FIREBASE_CLIENT_EMAIL'))?.trim();
    const key = (this.config.get<string>('GOOGLE_PRIVATE_KEY') || this.config.get<string>('FIREBASE_PRIVATE_KEY'))?.replace(/\\n/g, '\n');
    if (!email || !key) throw new Error('Credenciais da conta de serviço não configuradas.');
    return new google.auth.JWT({ email, key, scopes });
  }

  async test(key: IntegrationKey, user: AuthenticatedUser): Promise<IntegrationStatus> {
    const status = this.configuredStatus(key);
    if (!status.configured) { await this.log('ERROR', key, 'TESTE_CONEXAO', 'Integração não configurada.', user); return { ...status, connected: false }; }
    try {
      if (key === 'GOOGLE_SHEETS') await this.sheets.schemaStatus();
      if (key === 'GOOGLE_DRIVE') {
        const drive = google.drive({ version: 'v3', auth: this.googleAuth(['https://www.googleapis.com/auth/drive.metadata.readonly']) });
        await drive.files.list({ pageSize: 1, fields: 'files(id)' });
      }
      if (key === 'FIREBASE') {
        const auth = this.googleAuth(['https://www.googleapis.com/auth/firebase.messaging']);
        await auth.authorize();
      }
      if (key === 'GOOGLE_MAPS') {
        const mapsKey = this.config.get<string>('GOOGLE_MAPS_API_KEY') || this.config.get<string>('VITE_GOOGLE_MAPS_API_KEY');
        if (!mapsKey || mapsKey.length < 20) throw new Error('Chave do Google Maps inválida.');
      }
      if (key === 'MERCADO_PAGO') {
        const token = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN') || this.config.get<string>('MP_ACCESS_TOKEN');
        if (!token || token.length < 20) throw new Error('Token do Mercado Pago inválido.');
      }
      await this.log('INFO', key, 'TESTE_CONEXAO', 'Teste concluído com sucesso.', user);
      return { ...status, connected: true, message: 'Conexão testada com sucesso.', lastCheckedAt: this.now() };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no teste de conexão.';
      await this.log('ERROR', key, 'TESTE_CONEXAO', 'Falha no teste de conexão.', user, message);
      return { ...status, connected: false, message: 'Falha na conexão. Verifique a configuração no ambiente.', lastCheckedAt: this.now() };
    }
  }

  async schema() { return this.sheets.schemaStatus(); }

  async synchronize(user: AuthenticatedUser) {
    const startedAt = this.now();
    try {
      const sheetsReport = await this.sheets.ensureAllTabs();
      const warnings: string[] = [];
      let structures = { ministries: 0, cells: 0, cenacles: 0 };

      try {
        structures = await this.structureSync.reconcileAll();
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Falha ao reconciliar vínculos.';
        warnings.push(detail);
        await this.log('ERROR', 'SISTEMA', 'RECONCILIACAO_VINCULOS', 'As abas foram sincronizadas, mas os vínculos tiveram alerta.', user, detail);
      }

      const schema = await this.sheets.schemaStatus();
      const invalid = schema.filter((item) => !item.valid);
      const finishedAt = this.now();
      const createdTabs = sheetsReport.filter((item) => item.created).map((item) => item.tab);
      const changedTabs = sheetsReport.filter((item) => item.addedColumns.length > 0);
      const status = invalid.length || warnings.length ? 'COM_ALERTAS' : 'SUCESSO';

      await this.setConfig('technical.lastSyncAt', finishedAt, 'Data da última sincronização técnica.');
      await this.setConfig('technical.lastSyncStatus', status, 'Situação da última sincronização técnica.');
      await this.log('INFO', 'SISTEMA', 'SINCRONIZACAO_MANUAL', `Sincronização concluída. ${createdTabs.length} aba(s) criada(s), ${changedTabs.length} aba(s) atualizada(s).`, user, warnings.join(' | '));

      return {
        startedAt,
        finishedAt,
        success: true,
        status,
        createdTabs,
        updatedTabs: changedTabs.map((item) => ({ tab: item.tab, addedColumns: item.addedColumns })),
        invalidTabs: invalid.map((item) => item.tab),
        warnings,
        synchronizedStructures: structures,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida';
      await this.log('ERROR', 'SISTEMA', 'SINCRONIZACAO_MANUAL', 'Sincronização não concluída.', user, message);
      throw new BadRequestException(`Falha ao sincronizar o Google Sheets: ${message}`);
    }
  }

  private async setConfig(key: string, value: string, description: string) {
    if (this.sheets.isDemo()) return;
    const rows = await this.sheets.read('ConfiguracoesSistema');
    const existing = rows.find((row) => row.chave === key);
    const record = { id: existing?.id || randomUUID(), categoria: 'Tecnico', chave: key, valor: value, descricao: description, atualizado_em: this.now() };
    if (rows.some((row) => row.chave === key)) await this.sheets.updateRecord('ConfiguracoesSistema', 'chave', key, record);
    else await this.sheets.appendRecord('ConfiguracoesSistema', record);
  }

  async technicalSettings() {
    const rows = await this.sheets.read('ConfiguracoesSistema');
    const get = (key: string, fallback: string) => rows.find((row) => row.chave === key)?.valor || fallback;
    return {
      lastSyncAt: get('technical.lastSyncAt',''), lastSyncStatus: get('technical.lastSyncStatus','NUNCA_EXECUTADO'),
      notificationsEnabled: get('notifications.enabled','true') === 'true', notificationDefaultTime: get('notifications.defaultTime','08:00'),
      pushEnabled: get('notifications.pushEnabled','false') === 'true', emailEnabled: get('notifications.emailEnabled','false') === 'true',
    };
  }

  async updateNotificationSettings(input: Record<string, unknown>, user: AuthenticatedUser) {
    const entries: Array<[string,string,string]> = [
      ['notifications.enabled', String(Boolean(input.notificationsEnabled)), 'Ativa notificações do sistema.'],
      ['notifications.defaultTime', String(input.notificationDefaultTime || '08:00'), 'Horário padrão das notificações.'],
      ['notifications.pushEnabled', String(Boolean(input.pushEnabled)), 'Ativa canal Firebase Push.'],
      ['notifications.emailEnabled', String(Boolean(input.emailEnabled)), 'Ativa canal de e-mail.'],
    ];
    for (const [key,value,description] of entries) await this.setConfig(key,value,description);
    await this.log('INFO','NOTIFICACOES','ATUALIZACAO_CONFIGURACOES','Configurações técnicas de notificações atualizadas.',user);
    return this.technicalSettings();
  }

  async permissions(): Promise<PermissionRecord[]> {
    const rows = await this.sheets.read('PerfisPermissoes');
    return rows.map((row) => { const [resource, action] = String(row.permissao_codigo || '').split(':'); return { id: row.id, profileCode: row.perfil_codigo, resource, action, allowed: this.sheets.parseActive(row.permitido), scope: row.escopo, createdAt: row.criado_em, updatedAt: row.atualizado_em }; });
  }

  async savePermission(input: Partial<PermissionRecord>, user: AuthenticatedUser) {
    const profileCode = String(input.profileCode || '').trim().toUpperCase();
    const resource = String(input.resource || '').trim().toUpperCase();
    const action = String(input.action || '').trim().toUpperCase();
    if (!profileCode || !resource || !action) throw new BadRequestException('Perfil, recurso e ação são obrigatórios.');
    const now = this.now();
    const existing = (await this.permissions()).find((item) => item.id === input.id || (item.profileCode === profileCode && item.resource === resource && item.action === action));
    const record = { id: existing?.id || randomUUID(), perfil_codigo: profileCode, permissao_codigo: `${resource}:${action}`, permitido: input.allowed === false ? 'FALSE' : 'TRUE', escopo: String(input.scope || 'OWN').toUpperCase(), ativo: 'TRUE', criado_em: existing?.createdAt || now, atualizado_em: now };
    if (existing) await this.sheets.updateRecord('PerfisPermissoes','id',existing.id,record); else await this.sheets.appendRecord('PerfisPermissoes',record);
    await this.log('INFO','PERMISSOES','SALVAR_PERMISSAO',`${profileCode}: ${resource}/${action}`,user);
    return record;
  }

  async deletePermission(id: string, user: AuthenticatedUser) {
    const existing = (await this.permissions()).find((item) => item.id === id);
    if (!existing) throw new NotFoundException('Permissão não encontrada.');
    await this.sheets.updateRecord('PerfisPermissoes','id',id,{ id: existing.id, perfil_codigo: existing.profileCode, permissao_codigo: `${existing.resource}:${existing.action}`, permitido: 'FALSE', escopo: existing.scope, ativo: 'FALSE', criado_em: existing.createdAt, atualizado_em: this.now() });
    await this.log('INFO','PERMISSOES','DESATIVAR_PERMISSAO',id,user);
    return { success: true };
  }

  async history(limit = 100) {
    const rows = await this.sheets.read('IntegracoesHistorico');
    return rows.slice(-Math.min(Math.max(limit,1),500)).reverse();
  }
}
