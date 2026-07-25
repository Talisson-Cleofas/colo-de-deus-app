import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { GoogleSheetsService } from '../google/google-sheets.service';
import type { GeneralSettings, PublicGeneralSettings } from './settings.types';
import type { UpdateGeneralSettingsDto } from './update-settings.dto';

const defaults: GeneralSettings = {
  missionName: 'Colo de Deus',
  communityName: 'Missão Brasília',
  primaryLogo: '/brand/logo-oficial-branca.png',
  whiteLogo: '/brand/logo-oficial-branca.png',
  coverImage: '',
  primaryColor: '#d39a57',
  secondaryColor: '#a75db4',
  city: 'Brasília',
  state: 'DF',
  email: '',
  phone: '',
  website: '',
  instagram: '',
  birthdaysEnabled: true,
  showBirthdayAge: false,
  birthdayNotificationsEnabled: true,
  birthdayReminderDays: 3,
  birthdayNotificationAudience: 'ALL',
  birthdayDefaultMessage: 'Hoje celebramos a vida de {nome}! Que Deus abençoe sua caminhada e missão.',
  birthdayLeaderReminderMessage: 'Em {dias} dia(s), {nome} celebrará seu aniversário. Prepare uma mensagem especial!',
  absenceLimit: 3,
  justificationsEnabled: true,
  eventConfirmationRequired: true,
  eventDefaultScope: 'GENERAL',
  eventDefaultDurationMinutes: 120,
  eventReminderDays: 3,
  updatedAt: '',
  updatedBy: '',
};

const descriptions: Record<keyof GeneralSettings, string> = {
  missionName: 'Nome principal exibido no aplicativo.',
  communityName: 'Nome da comunidade ou missão local.',
  primaryLogo: 'URL da logo principal.',
  whiteLogo: 'URL da versão branca da logo.',
  coverImage: 'URL da imagem de capa.',
  primaryColor: 'Cor principal da identidade visual.',
  secondaryColor: 'Cor secundária da identidade visual.',
  city: 'Cidade padrão.', state: 'UF padrão.', email: 'E-mail institucional.', phone: 'Telefone institucional.',
  website: 'Site institucional.', instagram: 'Perfil do Instagram.',
  birthdaysEnabled: 'Ativa o módulo e os recursos de aniversários.',
  showBirthdayAge: 'Permite exibir a idade dos aniversariantes.',
  birthdayNotificationsEnabled: 'Ativa os avisos automáticos de aniversário.',
  birthdayReminderDays: 'Antecedência padrão para lembretes de aniversário.',
  birthdayNotificationAudience: 'Define se o aviso do dia vai para todos ou apenas líderes.',
  birthdayDefaultMessage: 'Mensagem padrão usada no aniversário do membro.',
  birthdayLeaderReminderMessage: 'Mensagem antecipada enviada aos líderes.',
  absenceLimit: 'Quantidade de ausências para alerta operacional.',
  justificationsEnabled: 'Permite o envio de justificativas de ausência.',
  eventConfirmationRequired: 'Define confirmação obrigatória como padrão em eventos.',
  eventDefaultScope: 'Abrangência padrão ao criar eventos.',
  eventDefaultDurationMinutes: 'Duração padrão dos eventos em minutos.',
  eventReminderDays: 'Antecedência padrão para lembretes de eventos.',
  updatedAt: 'Data da última atualização.', updatedBy: 'Administrador responsável pela última atualização.',
};

@Injectable()
export class SettingsService {
  private demoValue: GeneralSettings = { ...defaults };
  constructor(private readonly sheets: GoogleSheetsService) {}

  private parseBoolean(value: string, fallback: boolean) {
    if (!value.trim()) return fallback;
    return ['true', '1', 'sim', 'yes', 'ativo'].includes(value.trim().toLowerCase());
  }
  private parseNumber(value: string, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async get(): Promise<GeneralSettings> {
    if (this.sheets.isDemo()) return { ...this.demoValue };
    await this.sheets.ensureTab('ConfiguracoesSistema', ['id','categoria','chave','valor','descricao','atualizado_em']);
    const rows = await this.sheets.read('ConfiguracoesSistema');
    const values = Object.fromEntries(rows.map((row) => [row.chave, row.valor]));
    return {
      ...defaults,
      missionName: values.missionName || defaults.missionName,
      communityName: values.communityName || defaults.communityName,
      primaryLogo: values.primaryLogo || defaults.primaryLogo,
      whiteLogo: values.whiteLogo || defaults.whiteLogo,
      coverImage: values.coverImage || '',
      primaryColor: values.primaryColor || defaults.primaryColor,
      secondaryColor: values.secondaryColor || defaults.secondaryColor,
      city: values.city || defaults.city,
      state: values.state || defaults.state,
      email: values.email || '', phone: values.phone || '', website: values.website || '', instagram: values.instagram || '',
      birthdaysEnabled: this.parseBoolean(values.birthdaysEnabled || '', defaults.birthdaysEnabled),
      showBirthdayAge: this.parseBoolean(values.showBirthdayAge || '', defaults.showBirthdayAge),
      birthdayNotificationsEnabled: this.parseBoolean(values.birthdayNotificationsEnabled || '', defaults.birthdayNotificationsEnabled),
      birthdayReminderDays: this.parseNumber(values.birthdayReminderDays || '', defaults.birthdayReminderDays),
      birthdayNotificationAudience: (values.birthdayNotificationAudience === 'LEADERS' ? 'LEADERS' : 'ALL'),
      birthdayDefaultMessage: values.birthdayDefaultMessage || defaults.birthdayDefaultMessage,
      birthdayLeaderReminderMessage: values.birthdayLeaderReminderMessage || defaults.birthdayLeaderReminderMessage,
      absenceLimit: this.parseNumber(values.absenceLimit || '', defaults.absenceLimit),
      justificationsEnabled: this.parseBoolean(values.justificationsEnabled || '', defaults.justificationsEnabled),
      eventConfirmationRequired: this.parseBoolean(values.eventConfirmationRequired || '', defaults.eventConfirmationRequired),
      eventDefaultScope: (['GENERAL','MINISTRY','CELL','CENACLE'].includes(values.eventDefaultScope) ? values.eventDefaultScope : defaults.eventDefaultScope) as GeneralSettings['eventDefaultScope'],
      eventDefaultDurationMinutes: this.parseNumber(values.eventDefaultDurationMinutes || '', defaults.eventDefaultDurationMinutes),
      eventReminderDays: this.parseNumber(values.eventReminderDays || '', defaults.eventReminderDays),
      updatedAt: values.updatedAt || '', updatedBy: values.updatedBy || '',
    };
  }

  async getPublic(): Promise<PublicGeneralSettings> {
    const settings = await this.get();
    const { missionName, communityName, primaryLogo, whiteLogo, coverImage, primaryColor, secondaryColor, city, state, email, phone, website, instagram, birthdaysEnabled, showBirthdayAge } = settings;
    return { missionName, communityName, primaryLogo, whiteLogo, coverImage, primaryColor, secondaryColor, city, state, email, phone, website, instagram, birthdaysEnabled, showBirthdayAge };
  }

  async update(input: UpdateGeneralSettingsDto, user: AuthenticatedUser): Promise<GeneralSettings> {
    const current = await this.get();
    const now = new Date().toISOString();
    const next: GeneralSettings = { ...current, ...input, state: input.state?.trim().toUpperCase() ?? current.state, updatedAt: now, updatedBy: user.memberId || user.id };
    if (this.sheets.isDemo()) { this.demoValue = next; return { ...next }; }

    const rows = await this.sheets.read('ConfiguracoesSistema');
    const existing = new Map(rows.map((row) => [row.chave, row]));
    for (const key of Object.keys(next) as Array<keyof GeneralSettings>) {
      const value = String(next[key] ?? '');
      const record = { id: existing.get(key)?.id || randomUUID(), categoria: 'Sistema', chave: key, valor: value, descricao: descriptions[key], atualizado_em: now };
      if (existing.has(key)) await this.sheets.updateRecord('ConfiguracoesSistema', 'chave', key, record);
      else await this.sheets.appendRecord('ConfiguracoesSistema', record);
    }
    await this.sheets.appendRecord('Histórico', {
      id: randomUUID(), tabela: 'ConfiguracoesSistema', registro_id: 'GERAL', acao: 'ATUALIZACAO',
      usuario_id: user.memberId || user.id, usuario_email: user.email,
      dados_anteriores: JSON.stringify(current), dados_novos: JSON.stringify(next), ip: '', user_agent: '', data: now,
    });
    return next;
  }
}
