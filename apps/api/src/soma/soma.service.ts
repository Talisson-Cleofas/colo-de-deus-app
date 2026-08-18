import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { escapeCsvCell } from '../common/spreadsheet-cell';
import {
  MEMBER_REPOSITORY,
  type IMemberRepository,
} from '../persistence/interfaces/member-repository.interface';
import {
  SOMA_REPOSITORY,
  type ISomaRepository,
} from '../persistence/interfaces/soma-repository.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { MercadoPagoQueueService } from './mercado-pago-queue.service';
import { ReceiptService } from './receipt.service';
import type {
  CreateContributionDto,
  CreateSubscriptionDto,
  UpdateSomaSettingsDto,
} from './soma.dto';
import type {
  CheckoutInput,
  CheckoutResult,
  Contribution,
  FinancialReport,
  MercadoPagoPaymentRecord,
  MercadoPagoSubscriptionRecord,
  MercadoPagoWebhookBody,
  SomaSettings,
  SubscriptionCheckoutResult,
  SubscriptionSummary,
} from './soma.types';

type WebhookInput = {
  body: MercadoPagoWebhookBody;
  signature?: string;
  requestId?: string;
  queryDataId?: string;
  queryType?: string;
  ip?: string;
};
type WebhookJob = {
  id: string;
  key: string;
  resourceId: string;
  type: string;
  action: string;
  status: string;
  attempts: number;
  requestId: string;
  receivedAt: string;
  updatedAt: string;
  processedAt: string;
  lastError: string;
};
type Member = {
  id: string;
  nome: string;
  email: string;
  ministerio?: string;
  ministerio_id?: string;
  celula?: string;
  celula_id?: string;
};
type MercadoPagoPayment = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  description?: string;
  external_reference?: string | null;
  date_created?: string;
  date_approved?: string | null;
  date_last_updated?: string;
  live_mode?: boolean;
  authorization_code?: string;
  transaction_details?: {
    net_received_amount?: number;
    total_paid_amount?: number;
    installment_amount?: number;
    transaction_id?: string;
  };
  fee_details?: Array<{ amount?: number; type?: string }>;
  payer?: { email?: string; first_name?: string; last_name?: string };
  installments?: number;
  card?: {
    last_four_digits?: string;
    first_six_digits?: string;
    cardholder?: { name?: string };
    issuer?: { id?: string; name?: string };
  };
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
  };
  date_of_expiration?: string;
};
type MercadoPagoPreference = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  date_of_expiration?: string;
};
type MercadoPagoPreapproval = {
  id?: string;
  payer_email?: string;
  status?: string;
  reason?: string;
  external_reference?: string;
  date_created?: string;
  last_modified?: string;
  init_point?: string;
  back_url?: string;
  next_payment_date?: string;
  payment_method_id?: string | null;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number | string;
    currency_id?: string;
  };
};
type MercadoPagoAuthorizedPayment = {
  id?: string;
  preapproval_id?: string;
  external_reference?: string;
  status?: string;
  transaction_amount?: number;
  currency_id?: string;
  debit_date?: string;
  date_created?: string;
  last_modified?: string;
  retry_attempt?: number;
  payment?: { id?: string | number; status?: string; status_detail?: string };
};

const ADMIN_ROLES = ['ADMIN', 'DEVELOPER', 'MISSION_LEADER'];
const nowIso = () => new Date().toISOString();
const number = (value: unknown) => Number(value || 0);
const currency = (value: unknown) => Math.round((number(value) + Number.EPSILON) * 100) / 100;
const text = (value: unknown) => String(value ?? '');
const normalizeMonth = (value?: string) =>
  /^\d{4}-\d{2}$/.test(value || '') ? value! : new Date().toISOString().slice(0, 7);

@Injectable()
export class SomaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SomaService.name);
  private timer?: NodeJS.Timeout;
  private contributions: Contribution[] = [];
  private subscriptions: MercadoPagoSubscriptionRecord[] = [];
  constructor(
    private readonly config: ConfigService,
    @Inject(SOMA_REPOSITORY) private readonly sheets: ISomaRepository,
    @Inject(MEMBER_REPOSITORY) private readonly members: IMemberRepository,
    private readonly notifications: NotificationsService,
    private readonly queue: MercadoPagoQueueService,
    private readonly receipts: ReceiptService,
  ) {}
  onModuleInit() {
    if (!this.sheets.isDemo()) {
      this.timer = setInterval(() => void this.reconcilePreviousDay(), 24 * 60 * 60 * 1000);
      void this.recoverWebhookJobs().catch((error) =>
        this.logger.error(
          'Falha ao recuperar webhooks pendentes.',
          error instanceof Error ? error.stack : String(error),
        ),
      );
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private defaults(): SomaSettings {
    return {
      campaignName: 'Soma+ Missão Brasília',
      description: 'Sua contribuição sustenta a evangelização, formações e ações missionárias.',
      pixKey: text(this.config.get('SOMA_PIX_KEY') || 'colodedeusfinanceirobsb@gmail.com'),
      pixKeyType: text(this.config.get('SOMA_PIX_KEY_TYPE') || 'E-mail'),
      beneficiary: text(this.config.get('SOMA_BENEFICIARY') || 'Colo de Deus - Missão Brasília'),
      city: text(this.config.get('SOMA_CITY') || 'Brasília'),
      goal: number(this.config.get('SOMA_MONTHLY_GOAL') || 50000),
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      active: true,
      pixBank: text(this.config.get('SOMA_PIX_BANK') || 'Mercado Pago'),
      pixAgency: text(this.config.get('SOMA_PIX_AGENCY') || '0001'),
      pixAccount: text(this.config.get('SOMA_PIX_ACCOUNT') || '8838451371-7'),
      pixCnpj: text(this.config.get('SOMA_PIX_CNPJ') || '66.312.954/0001-48'),
      subscriptionUrl: text(this.config.get('SOMA_SUBSCRIPTION_URL')),
      pixQrCodeUrl: text(
        this.config.get('SOMA_PIX_QR_CODE_URL') || '/assets/mercado-pago-pix-qr.png',
      ),
    };
  }
  async settings(): Promise<SomaSettings> {
    const base = this.defaults();
    try {
      const rows = await this.sheets.read('Financeiro');
      const row = rows.find((x) => (x.id || 'principal') === 'principal') || rows[0];
      if (!row) return base;
      return {
        ...base,
        pixKey: row.pix_key || base.pixKey,
        pixBank: row.pix_bank || base.pixBank,
        pixAgency: row.pix_agency || base.pixAgency,
        pixAccount: row.pix_account || base.pixAccount,
        pixCnpj: row.pix_cnpj || base.pixCnpj,
        subscriptionUrl: row.subscription_url || base.subscriptionUrl,
        pixQrCodeUrl: row.pix_qrcode_drive || base.pixQrCodeUrl,
      };
    } catch {
      return base;
    }
  }
  async updateSettings(input: UpdateSomaSettingsDto, user: AuthenticatedUser) {
    if (!ADMIN_ROLES.includes(user.profile))
      throw new ForbiddenException(
        'Apenas administradores podem alterar as configurações financeiras.',
      );
    const current = await this.settings();
    const next = { ...current, ...input, updated_at: nowIso() };
    const record = {
      id: 'principal',
      pix_key: text(next.pixKey),
      pix_bank: text(next.pixBank),
      pix_agency: text(next.pixAgency),
      pix_account: text(next.pixAccount),
      pix_cnpj: text(next.pixCnpj),
      subscription_url: text(next.subscriptionUrl),
      pix_qrcode_drive: text(next.pixQrCodeUrl),
      updated_at: text(next.updated_at),
    };
    if (!this.sheets.isDemo()) {
      const rows = await this.sheets.read('Financeiro');
      if (rows.some((x) => x.id === 'principal'))
        await this.sheets.updateRecord('Financeiro', 'id', 'principal', record);
      else await this.sheets.appendRecord('Financeiro', record);
    }
    return next;
  }
  async subscription(user: AuthenticatedUser): Promise<SubscriptionSummary> {
    const record = await this.subscriptionRecordForUser(user);
    const payments = await this.listMyPayments(user);
    const latest = payments.find((x) => x.status === 'approved');
    if (!record)
      return {
        id: null,
        status: 'INACTIVE',
        providerStatus: '',
        plan: 'Contribuição mensal',
        amount: null,
        nextCharge: null,
        cardLastFour: latest?.card_last_four || null,
        manageUrl: '',
        canCancel: false,
        updatedAt: null,
      };
    return {
      id: record.preapproval_id,
      status: this.subscriptionStatus(record.status),
      providerStatus: record.status,
      plan: record.reason || 'Contribuição mensal',
      amount: record.amount || latest?.amount || null,
      nextCharge: record.next_payment_date || null,
      cardLastFour: latest?.card_last_four || null,
      manageUrl: record.status === 'pending' ? record.checkout_url : '',
      canCancel: ['pending', 'authorized', 'paused'].includes(record.status),
      updatedAt: record.updated_at || record.last_modified || null,
    };
  }
  async createSubscription(
    input: CreateSubscriptionDto,
    user: AuthenticatedUser,
  ): Promise<SubscriptionCheckoutResult> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 1)
      throw new BadRequestException('Informe um valor mensal válido, a partir de R$ 1,00.');
    const member = await this.resolveCheckoutMember(
      { amount, memberId: user.memberId || user.id },
      user,
    );
    if (!member.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email))
      throw new BadRequestException('O cadastro do membro precisa ter um e-mail válido.');
    const existing = await this.subscriptionRecordForUser(user);
    if (existing && ['authorized', 'paused'].includes(existing.status))
      throw new ConflictException('Já existe uma assinatura vinculada a este membro.');
    if (existing?.status === 'pending' && existing.checkout_url)
      return {
        subscriptionId: existing.preapproval_id,
        externalReference: existing.external_reference,
        checkoutUrl: existing.checkout_url,
        amount: existing.amount,
        currency: 'BRL',
        status: 'PENDING',
      };
    const frontendUrl = text(this.config.get('FRONTEND_URL') || this.config.get('WEB_URL')).replace(
      /\/$/,
      '',
    );
    if (!frontendUrl)
      throw new BadRequestException('FRONTEND_URL não configurado para o retorno da assinatura.');
    const settings = await this.settings();
    const reason = text(input.reason || settings.campaignName || 'Contribuição mensal Soma+')
      .trim()
      .slice(0, 120);
    const externalReference = `SOMA-ASSINATURA|${member.id}|${randomUUID()}`;
    const preapproval = await this.mpRequest<MercadoPagoPreapproval>(
      '/preapproval',
      {
        method: 'POST',
        body: JSON.stringify({
          reason,
          external_reference: externalReference,
          payer_email: member.email.trim().toLowerCase(),
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'BRL',
          },
          back_url: `${frontendUrl}/soma?subscription=return&tab=contribuicoes`,
          status: 'pending',
        }),
      },
      { 'X-Idempotency-Key': randomUUID() },
    );
    if (!preapproval.id || !preapproval.init_point)
      throw new BadRequestException('O Mercado Pago não retornou o link da assinatura.');
    await this.saveSubscription(
      {
        ...preapproval,
        external_reference: preapproval.external_reference || externalReference,
        payer_email: preapproval.payer_email || member.email.trim().toLowerCase(),
        reason: preapproval.reason || reason,
        back_url:
          preapproval.back_url || `${frontendUrl}/soma?subscription=return&tab=contribuicoes`,
        auto_recurring: preapproval.auto_recurring || {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: 'BRL',
        },
      },
      'subscription.created',
      member,
    );
    await this.audit('SUBSCRIPTION_CREATED', preapproval.id, {
      member_id: member.id,
      amount: String(amount),
      external_reference: externalReference,
    });
    return {
      subscriptionId: preapproval.id,
      externalReference,
      checkoutUrl: preapproval.init_point,
      amount,
      currency: 'BRL',
      status: 'PENDING',
    };
  }
  async refreshSubscription(user: AuthenticatedUser): Promise<SubscriptionSummary> {
    const current = await this.subscriptionRecordForUser(user);
    if (!current) return this.subscription(user);
    const remote = await this.fetchSubscription(current.preapproval_id);
    await this.saveSubscription(remote, 'subscription.manual_refresh');
    return this.subscription(user);
  }
  async cancelSubscription(user: AuthenticatedUser): Promise<SubscriptionSummary> {
    const current = await this.subscriptionRecordForUser(user);
    if (!current) throw new NotFoundException('Nenhuma assinatura vinculada a este membro.');
    if (current.status === 'cancelled') return this.subscription(user);
    if (!['pending', 'authorized', 'paused'].includes(current.status))
      throw new BadRequestException('Esta assinatura não pode ser cancelada no estado atual.');
    const remote = await this.mpRequest<MercadoPagoPreapproval>(
      `/preapproval/${encodeURIComponent(current.preapproval_id)}`,
      { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) },
      { 'X-Idempotency-Key': randomUUID() },
    );
    await this.saveSubscription(remote, 'subscription.cancelled');
    await this.audit('SUBSCRIPTION_CANCELLED', current.preapproval_id, {
      member_id: current.member_id,
    });
    return this.subscription(user);
  }
  async list(user: AuthenticatedUser) {
    const rows = this.sheets.isDemo()
      ? this.contributions
      : (await this.sheets.read('Soma')).map((row) => this.rowToContribution(row));
    return ADMIN_ROLES.includes(user.profile)
      ? rows
      : rows.filter(
          (item) =>
            item.memberId === (user.memberId || user.id) ||
            item.email.toLowerCase() === user.email.toLowerCase(),
        );
  }
  async create(input: CreateContributionDto, user: AuthenticatedUser) {
    const amount = number(input.amount);
    if (!Number.isFinite(amount) || amount < 1)
      throw new BadRequestException('Informe um valor válido, a partir de R$ 1,00.');
    const memberId = text(user.memberId || user.id);
    const item: Contribution = {
      id: randomUUID(),
      memberId,
      memberName: text(user.name),
      email: text(user.email).trim().toLowerCase(),
      amount,
      date: text(input.date || new Date().toISOString().slice(0, 10)),
      referenceMonth: text(input.referenceMonth || new Date().toISOString().slice(0, 7)),
      method: text(input.method || 'PIX'),
      status: 'PENDING',
      receiptUrl: text(input.receiptUrl),
      notes: text(input.notes),
    };
    if (this.sheets.isDemo()) this.contributions.unshift(item);
    else
      await this.sheets.appendRecord('Soma', {
        id: item.id,
        membro_id: item.memberId,
        membro_nome: item.memberName,
        email: item.email,
        competencia: item.referenceMonth,
        valor: String(item.amount),
        data: item.date,
        tipo: 'CONTRIBUICAO',
        forma_pagamento: item.method,
        status: item.status,
        comprovante: item.receiptUrl,
        transacao_id: '',
        confirmado_por: '',
        confirmado_em: '',
        observacao: item.notes,
        criado_em: nowIso(),
        atualizado_em: nowIso(),
        comprovante_drive_file_id: '',
        comprovante_url: item.receiptUrl,
      });
    return item;
  }

  async createCheckout(input: CheckoutInput, user: AuthenticatedUser): Promise<CheckoutResult> {
    const member = await this.resolveCheckoutMember(input, user);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 1)
      throw new BadRequestException('Informe um valor válido, a partir de R$ 1,00.');
    const competence = normalizeMonth(input.competence);
    const externalReference = `SOMA|${member.id}|${competence}`;
    const apiUrl = text(
      this.config.get('PUBLIC_API_URL') || this.config.get('APP_API_URL'),
    ).replace(/\/$/, '');
    const frontendUrl = text(this.config.get('FRONTEND_URL') || this.config.get('WEB_URL')).replace(
      /\/$/,
      '',
    );
    const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const preference = await this.mpRequest<MercadoPagoPreference>(
      '/checkout/preferences',
      {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              id: `soma-${competence}`,
              title: input.description || 'Contribuição Soma+',
              description: `Contribuição de ${member.nome} - competência ${competence}`,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: amount,
            },
          ],
          payer: { name: member.nome, email: member.email },
          external_reference: externalReference,
          notification_url: apiUrl
            ? `${apiUrl}/api/soma/webhooks/mercadopago?source_news=webhooks`
            : undefined,
          date_of_expiration: expiration,
          expires: true,
          back_urls: frontendUrl
            ? {
                success: `${frontendUrl}/soma?payment=success`,
                pending: `${frontendUrl}/soma?payment=pending`,
                failure: `${frontendUrl}/soma?payment=failure`,
              }
            : undefined,
          auto_return: frontendUrl ? 'approved' : undefined,
          metadata: { member_id: member.id, competence },
        }),
      },
      { 'X-Idempotency-Key': randomUUID() },
    );
    await this.audit('CHECKOUT_CREATED', externalReference, {
      member_id: member.id,
      amount: String(amount),
      preference_id: preference.id,
    });
    return {
      preferenceId: preference.id,
      externalReference,
      checkoutUrl: preference.init_point,
      sandboxUrl: preference.sandbox_init_point,
      expiresAt: preference.date_of_expiration || expiration,
      status: 'created',
    };
  }
  private async resolveCheckoutMember(
    input: CheckoutInput,
    user: AuthenticatedUser,
  ): Promise<Member> {
    const requested = input.memberId || user.memberId || user.id;
    const rows = await this.members.read('Membros');
    let row = rows.find((x) => x.id === requested);
    if (!row && input.email)
      row = rows.find((x) => text(x.email).toLowerCase() === input.email!.toLowerCase());
    if (!row && user.email)
      row = rows.find((x) => text(x.email).toLowerCase() === user.email.toLowerCase());
    if (!row) throw new NotFoundException('Membro não encontrado para criar o checkout.');
    if (user.profile === 'MEMBER' && row.id !== (user.memberId || user.id))
      throw new ForbiddenException('Um membro só pode criar checkout para o próprio cadastro.');
    return {
      id: text(row.id),
      nome: text(row.nome || input.name || user.name),
      email: text(row.email || input.email || user.email),
      ministerio: text(row.ministerio),
      ministerio_id: text(row.ministerio_id),
      celula: text(row.celula),
      celula_id: text(row.celula_id),
    };
  }

  async listMyPayments(user: AuthenticatedUser) {
    const rows = await this.paymentRows();
    return rows
      .filter(
        (x) =>
          x.member_id === (user.memberId || user.id) ||
          x.payer_email.toLowerCase() === user.email.toLowerCase(),
      )
      .sort((a, b) =>
        (b.date_approved || b.date_created).localeCompare(a.date_approved || a.date_created),
      );
  }
  async paymentReport(user: AuthenticatedUser, month = normalizeMonth()) {
    const report = await this.financialReport(user, { from: `${month}-01`, to: `${month}-31` });
    return {
      month,
      scope: ADMIN_ROLES.includes(user.profile) ? 'ADMIN' : 'MEMBER',
      total: report.totals.gross,
      approved: report.counters.approved,
      pending: report.counters.pending,
      rejected: report.counters.rejected,
      payments: report.payments,
    };
  }
  async financialReport(
    user: AuthenticatedUser,
    filter: { from?: string; to?: string; status?: string; method?: string } = {},
  ): Promise<FinancialReport> {
    let rows = await this.paymentRows();
    if (!ADMIN_ROLES.includes(user.profile))
      rows = rows.filter(
        (x) =>
          x.member_id === (user.memberId || user.id) ||
          x.payer_email.toLowerCase() === user.email.toLowerCase(),
      );
    const from = filter.from || `${new Date().getFullYear()}-01-01`,
      to = filter.to || `${new Date().getFullYear()}-12-31`;
    rows = rows.filter((x) => {
      const d = (x.date_approved || x.date_created).slice(0, 10);
      return (
        d >= from &&
        d <= to &&
        (!filter.status || x.status === filter.status) &&
        (!filter.method || x.payment_type === filter.method || x.payment_method === filter.method)
      );
    });
    const approved = rows.filter((x) => x.status === 'approved');
    const sum = (list: MercadoPagoPaymentRecord[], key: 'amount' | 'fee_amount' | 'net_amount') =>
      currency(list.reduce((s, x) => s + number(x[key]), 0));
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const month = today.slice(0, 7),
      year = today.slice(0, 4);
    const periodGross = (predicate: (x: MercadoPagoPaymentRecord) => boolean) =>
      sum(approved.filter(predicate), 'amount');
    const group = (key: (x: MercadoPagoPaymentRecord) => string) =>
      Object.values(
        approved.reduce<
          Record<string, { key: string; label: string; count: number; gross: number; net: number }>
        >((acc, x) => {
          const k = key(x) || 'outros';
          const item = acc[k] || { key: k, label: k, count: 0, gross: 0, net: 0 };
          item.count++;
          item.gross += x.amount;
          item.net += x.net_amount;
          acc[k] = item;
          return acc;
        }, {}),
      );
    const members = await this.memberRows();
    const byOrg = (kind: 'ministry' | 'cell') => {
      const buckets = new Map<string, { id: string; name: string; members: Member[] }>();
      for (const m of members) {
        const id =
          kind === 'ministry'
            ? m.ministerio_id || m.ministerio || 'sem-ministerio'
            : m.celula_id || m.celula || 'sem-celula';
        const name =
          kind === 'ministry' ? m.ministerio || 'Sem ministério' : m.celula || 'Sem célula';
        const b = buckets.get(id) || { id, name, members: [] };
        b.members.push(m);
        buckets.set(id, b);
      }
      return [...buckets.values()]
        .map((b) => {
          const ids = new Set(b.members.map((m) => m.id));
          const pays = approved.filter((p) => ids.has(p.member_id));
          const payers = new Set(pays.map((p) => p.member_id));
          return {
            id: b.id,
            name: b.name,
            members: b.members.length,
            payers: payers.size,
            pending: Math.max(0, b.members.length - payers.size),
            gross: sum(pays, 'amount'),
            percentage: b.members.length ? Math.round((payers.size / b.members.length) * 100) : 0,
          };
        })
        .sort((a, b) => b.gross - a.gross);
    };
    const byMonth = group((x) => x.reference_month)
      .map((x) => ({
        month: x.key,
        gross: x.gross,
        fees: sum(
          approved.filter((p) => p.reference_month === x.key),
          'fee_amount',
        ),
        net: x.net,
        count: x.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    return {
      period: { from, to },
      totals: {
        gross: sum(approved, 'amount'),
        fees: sum(approved, 'fee_amount'),
        net: sum(approved, 'net_amount'),
        ticketAverage: approved.length ? sum(approved, 'amount') / approved.length : 0,
        today: periodGross((x) => (x.date_approved || x.date_created).startsWith(today)),
        week: periodGross((x) => (x.date_approved || x.date_created).slice(0, 10) >= weekAgo),
        month: periodGross((x) => (x.date_approved || x.date_created).startsWith(month)),
        year: periodGross((x) => (x.date_approved || x.date_created).startsWith(year)),
      },
      counters: {
        approved: approved.length,
        pending: rows.filter((x) => ['pending', 'in_process', 'authorized'].includes(x.status))
          .length,
        rejected: rows.filter((x) => ['rejected', 'cancelled'].includes(x.status)).length,
        refunded: rows.filter((x) => x.status.includes('refund')).length,
        chargedBack: rows.filter((x) => x.status === 'charged_back').length,
      },
      byMethod: group((x) => x.payment_type || x.payment_method),
      byMonth,
      byMinistry: byOrg('ministry'),
      byCell: byOrg('cell'),
      payments: rows,
    };
  }

  async personalFinancialReport(
    user: AuthenticatedUser,
    filter: { from?: string; to?: string; status?: string; method?: string } = {},
  ): Promise<FinancialReport> {
    if (ADMIN_ROLES.includes(user.profile))
      throw new ForbiddenException('Use o centro financeiro para consultar o relatório geral.');
    return this.financialReport(user, filter);
  }
  async summary(month = normalizeMonth()) {
    const report = await this.financialReport({ profile: 'ADMIN' } as AuthenticatedUser, {
      from: `${month}-01`,
      to: `${month}-31`,
    });
    const goal = (await this.settings()).goal;
    return {
      month,
      total: report.totals.gross,
      goal,
      percentage: goal ? Math.min(100, Math.round((report.totals.gross / goal) * 100)) : 0,
      confirmed: report.counters.approved,
      pending: report.counters.pending,
      average: report.totals.ticketAverage,
    };
  }

  async receiveMercadoPagoWebhook(input: WebhookInput) {
    const dataId = text(input.queryDataId || input.body.data?.id).trim();
    const type = text(input.queryType || input.body.type).trim();
    if (!dataId) return { received: true, queued: false, reason: 'Notificação sem data.id.' };
    this.validateWebhookSignature(dataId, input.signature, input.requestId);
    const action = input.body.action || `${type || 'unknown'}.updated`;
    const key = `${dataId}|${action}|${input.body.date_created || ''}`;
    if (this.sheets.isDemo()) {
      const queued = this.queue.enqueue(key, () =>
        this.processWebhook({ ...input, queryDataId: dataId, queryType: type }),
      );
      return { received: true, queued, id: dataId, type, queueSize: this.queue.size() };
    }
    const job = await this.persistWebhookJob({
      key,
      resourceId: dataId,
      type: type || 'unknown',
      action,
      requestId: text(input.requestId),
    });
    if (job.status === 'PROCESSED')
      return { received: true, queued: false, duplicate: true, id: dataId, type };
    const queued = this.queue.enqueue(job.id, () => this.runWebhookJob(job.id));
    return { received: true, queued, id: dataId, type, queueSize: this.queue.size() };
  }
  private async processWebhook(input: WebhookInput) {
    const started = Date.now();
    const dataId = text(input.queryDataId);
    const type = text(input.queryType || input.body.type);
    const action = input.body.action || `${type || 'unknown'}.updated`;
    let status = 'PROCESSED',
      error = '';
    try {
      if (type === 'payment' || action.startsWith('payment.')) {
        const payment = await this.fetchPayment(dataId);
        const saved = await this.savePayment(payment, action);
        status = saved ? 'PAYMENT_SAVED' : 'PAYMENT_IGNORED';
      } else if (
        type === 'subscription_preapproval' ||
        action.startsWith('subscription_preapproval.')
      ) {
        const subscription = await this.fetchSubscription(dataId);
        await this.saveSubscription(subscription, action);
        status = 'SUBSCRIPTION_SAVED';
      } else if (
        type === 'subscription_authorized_payment' ||
        action.startsWith('subscription_authorized_payment.')
      ) {
        const invoice = await this.fetchAuthorizedPayment(dataId);
        await this.saveAuthorizedPayment(invoice, action);
        status = 'SUBSCRIPTION_PAYMENT_SAVED';
      } else status = 'IGNORED';
    } catch (e) {
      status = 'ERROR';
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      await this.saveWebhookLog({
        resourceId: dataId,
        type: type || 'unknown',
        action,
        status,
        error,
        input,
        processingTime: Date.now() - started,
      });
    }
  }
  private maxWebhookAttempts() {
    const value = Number(this.config.get('MERCADO_PAGO_WEBHOOK_MAX_ATTEMPTS') || 5);
    return Math.min(10, Math.max(1, Number.isFinite(value) ? value : 5));
  }
  private webhookJobFromRow(row: Record<string, string>): WebhookJob {
    return {
      id: text(row.id),
      key: text(row.key),
      resourceId: text(row.resource_id),
      type: text(row.type),
      action: text(row.action),
      status: text(row.status),
      attempts: number(row.attempts),
      requestId: text(row.request_id),
      receivedAt: text(row.received_at),
      updatedAt: text(row.updated_at),
      processedAt: text(row.processed_at),
      lastError: text(row.last_error),
    };
  }
  private webhookJobRow(job: WebhookJob) {
    return {
      id: job.id,
      key: job.key,
      resource_id: job.resourceId,
      type: job.type,
      action: job.action,
      status: job.status,
      attempts: String(job.attempts),
      request_id: job.requestId,
      received_at: job.receivedAt,
      updated_at: job.updatedAt,
      processed_at: job.processedAt,
      last_error: job.lastError,
    };
  }
  private async persistWebhookJob(
    input: Pick<WebhookJob, 'key' | 'resourceId' | 'type' | 'action' | 'requestId'>,
  ) {
    const id = createHash('sha256').update(input.key).digest('hex');
    const existing = (await this.sheets.read('WebhookJobs')).find((row) => row.id === id);
    if (existing) return this.webhookJobFromRow(existing);
    const timestamp = nowIso();
    const job: WebhookJob = {
      id,
      ...input,
      status: 'PENDING',
      attempts: 0,
      receivedAt: timestamp,
      updatedAt: timestamp,
      processedAt: '',
      lastError: '',
    };
    await this.sheets.appendRecord('WebhookJobs', this.webhookJobRow(job));
    return job;
  }
  private async updateWebhookJob(job: WebhookJob) {
    job.updatedAt = nowIso();
    await this.sheets.updateRecord('WebhookJobs', 'id', job.id, this.webhookJobRow(job));
  }
  private async runWebhookJob(jobId: string) {
    const row = (await this.sheets.read('WebhookJobs')).find((item) => item.id === jobId);
    if (!row) return;
    const job = this.webhookJobFromRow(row);
    if (job.status === 'PROCESSED' || job.status === 'DEAD') return;
    if (job.attempts >= this.maxWebhookAttempts()) {
      job.status = 'DEAD';
      job.lastError = 'Limite de tentativas atingido.';
      await this.updateWebhookJob(job);
      return;
    }
    job.status = 'PROCESSING';
    job.attempts += 1;
    await this.updateWebhookJob(job);
    try {
      await this.processWebhook({
        body: { type: job.type, action: job.action, data: { id: job.resourceId } },
        queryDataId: job.resourceId,
        queryType: job.type,
        requestId: job.requestId,
      });
      job.status = 'PROCESSED';
      job.processedAt = nowIso();
      job.lastError = '';
      await this.updateWebhookJob(job);
    } catch (error) {
      job.lastError = (error instanceof Error ? error.message : String(error)).slice(0, 500);
      job.status = job.attempts >= this.maxWebhookAttempts() ? 'DEAD' : 'RETRY';
      await this.updateWebhookJob(job);
      if (job.status !== 'DEAD') throw error;
    }
  }
  private async recoverWebhookJobs() {
    const rows = await this.sheets.read('WebhookJobs');
    for (const row of rows) {
      const job = this.webhookJobFromRow(row);
      if (
        ['PENDING', 'PROCESSING', 'RETRY'].includes(job.status) &&
        job.attempts < this.maxWebhookAttempts()
      )
        this.queue.enqueue(job.id, () => this.runWebhookJob(job.id));
    }
  }
  private validateWebhookSignature(dataId: string, signature?: string, requestId?: string) {
    const secret = text(this.config.get('MERCADO_PAGO_WEBHOOK_SECRET')).trim();
    const allowUnsigned =
      text(this.config.get('MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS')).toLowerCase() === 'true';
    if (!secret) {
      if (allowUnsigned) return;
      throw new UnauthorizedException('MERCADO_PAGO_WEBHOOK_SECRET não configurado.');
    }
    if (!signature || !requestId) throw new UnauthorizedException('Assinatura do webhook ausente.');
    const parts = Object.fromEntries(signature.split(',').map((p) => p.trim().split('=')));
    const ts = parts.ts,
      received = parts.v1;
    if (!ts || !received) throw new UnauthorizedException('Assinatura inválida.');
    const rawTimestamp = Number(ts);
    const timestampMs = rawTimestamp < 1e12 ? rawTimestamp * 1000 : rawTimestamp;
    const tolerance =
      Number(this.config.get('MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS') || 900) * 1000;
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > tolerance)
      throw new UnauthorizedException('Assinatura do webhook expirada.');
    const expected = createHmac('sha256', secret)
      .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8'),
      b = Buffer.from(received, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new UnauthorizedException('Origem do webhook não autenticada.');
  }
  private fetchPayment(id: string) {
    return this.mpRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`);
  }
  private fetchSubscription(id: string) {
    return this.mpRequest<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(id)}`);
  }
  private fetchAuthorizedPayment(id: string) {
    return this.mpRequest<MercadoPagoAuthorizedPayment>(
      `/authorized_payments/${encodeURIComponent(id)}`,
    );
  }
  private async saveSubscription(
    preapproval: MercadoPagoPreapproval,
    action: string,
    fallbackMember?: Member,
  ) {
    const preapprovalId = text(preapproval.id);
    if (!preapprovalId) throw new BadRequestException('Assinatura do Mercado Pago sem ID.');
    const rows = await this.subscriptionRows();
    const existing = rows.find((item) => item.preapproval_id === preapprovalId);
    const externalReference = text(preapproval.external_reference || existing?.external_reference);
    const parsed = this.parseExternalReference(externalReference);
    const payerEmail = text(preapproval.payer_email || existing?.payer_email)
      .trim()
      .toLowerCase();
    const member =
      fallbackMember ||
      (parsed.memberId ? await this.findMemberById(parsed.memberId) : null) ||
      (existing?.member_id ? await this.findMemberById(existing.member_id) : null) ||
      (payerEmail ? await this.findMemberByEmail(payerEmail) : null);
    const timestamp = nowIso();
    const record: MercadoPagoSubscriptionRecord = {
      id: preapprovalId,
      preapproval_id: preapprovalId,
      member_id: member?.id || existing?.member_id || parsed.memberId,
      member_name: member?.nome || existing?.member_name || '',
      payer_email: payerEmail || member?.email || '',
      external_reference: externalReference,
      status: text(preapproval.status || existing?.status || 'unknown').toLowerCase(),
      reason: text(preapproval.reason || existing?.reason || 'Contribuição mensal Soma+'),
      amount: number(preapproval.auto_recurring?.transaction_amount ?? existing?.amount),
      currency: text(preapproval.auto_recurring?.currency_id || existing?.currency || 'BRL'),
      frequency: number(preapproval.auto_recurring?.frequency ?? existing?.frequency ?? 1),
      frequency_type: text(
        preapproval.auto_recurring?.frequency_type || existing?.frequency_type || 'months',
      ),
      next_payment_date: text(preapproval.next_payment_date || existing?.next_payment_date),
      payment_method: text(preapproval.payment_method_id || existing?.payment_method),
      checkout_url: text(preapproval.init_point || existing?.checkout_url),
      back_url: text(preapproval.back_url || existing?.back_url),
      date_created: text(preapproval.date_created || existing?.date_created || timestamp),
      last_modified: text(preapproval.last_modified || timestamp),
      webhook_action: action,
      created_at: existing?.created_at || timestamp,
      updated_at: timestamp,
    };
    if (this.sheets.isDemo()) {
      this.subscriptions = [record, ...this.subscriptions.filter((item) => item.id !== record.id)];
    } else if (existing) {
      await this.sheets.updateRecord('AssinaturasSoma', 'id', record.id, this.toRow(record));
    } else {
      await this.sheets.appendRecord('AssinaturasSoma', this.toRow(record));
    }
    if (existing?.status !== record.status)
      await this.notifySubscription(record, Boolean(existing));
    await this.audit(`SUBSCRIPTION_${record.status.toUpperCase()}`, preapprovalId, {
      member_id: record.member_id,
      status: record.status,
      amount: String(record.amount),
    });
    return record;
  }
  private async saveAuthorizedPayment(invoice: MercadoPagoAuthorizedPayment, action: string) {
    const invoiceId = text(invoice.id);
    if (!invoiceId) throw new BadRequestException('Cobrança recorrente do Mercado Pago sem ID.');
    const preapprovalId = text(invoice.preapproval_id);
    let subscription = (await this.subscriptionRows()).find(
      (item) => item.preapproval_id === preapprovalId,
    );
    if (!subscription && preapprovalId) {
      const remote = await this.fetchSubscription(preapprovalId);
      subscription = await this.saveSubscription(remote, `${action}.subscription_sync`);
    }
    if (subscription)
      this.validateSubscriptionCharge(
        number(invoice.transaction_amount),
        text(invoice.currency_id || 'BRL'),
        subscription,
      );
    const paymentId = text(invoice.payment?.id);
    const payload = {
      id: invoiceId,
      authorized_payment_id: invoiceId,
      preapproval_id: preapprovalId,
      member_id: subscription?.member_id || '',
      external_reference: text(invoice.external_reference || subscription?.external_reference),
      status: text(invoice.status),
      payment_id: paymentId,
      payment_status: text(invoice.payment?.status),
      amount: String(number(invoice.transaction_amount)),
      currency: text(invoice.currency_id || 'BRL'),
      debit_date: text(invoice.debit_date),
      date_created: text(invoice.date_created),
      last_modified: text(invoice.last_modified),
      retry_attempt: String(number(invoice.retry_attempt)),
      webhook_action: action,
      updated_at: nowIso(),
    };
    if (!this.sheets.isDemo()) {
      const rows = await this.sheets.read('CobrancasAssinaturas');
      if (rows.some((item) => item.id === invoiceId))
        await this.sheets.updateRecord('CobrancasAssinaturas', 'id', invoiceId, payload);
      else await this.sheets.appendRecord('CobrancasAssinaturas', payload);
    }
    if (paymentId) {
      const payment = await this.fetchPayment(paymentId);
      await this.savePayment(
        {
          ...payment,
          external_reference:
            payment.external_reference ||
            invoice.external_reference ||
            subscription?.external_reference,
        },
        action,
      );
    }
    await this.audit('SUBSCRIPTION_INVOICE_UPDATED', invoiceId, {
      member_id: subscription?.member_id || '',
      preapproval_id: preapprovalId,
      payment_id: paymentId,
      status: text(invoice.status),
    });
  }
  private async savePayment(payment: MercadoPagoPayment, action: string) {
    const paymentId = text(payment.id);
    const external = text(payment.external_reference);
    const parsed = this.parseExternalReference(external);
    if (!parsed.memberId) {
      await this.audit('PAYMENT_IGNORED_UNLINKED', paymentId, {
        status: text(payment.status || 'unknown'),
      });
      return false;
    }
    if (parsed.subscription) {
      const linkedSubscription = (await this.subscriptionRows()).find(
        (item) => item.external_reference === external,
      );
      if (linkedSubscription)
        this.validateSubscriptionCharge(
          number(payment.transaction_amount),
          text(payment.currency_id || 'BRL'),
          linkedSubscription,
        );
    }
    const email = text(payment.payer?.email).trim().toLowerCase();
    const member = parsed.memberId
      ? await this.findMemberById(parsed.memberId)
      : await this.findMemberByEmail(email);
    const created = text(payment.date_created || nowIso());
    const approved = text(payment.date_approved);
    const amount = currency(payment.transaction_amount);
    const listedFees = currency(
      (payment.fee_details || []).reduce((s, x) => s + number(x.amount), 0),
    );
    const providerNet = currency(payment.transaction_details?.net_received_amount);
    const net = providerNet > 0 ? providerNet : currency(Math.max(0, amount - listedFees));
    // fee_details pode omitir impostos/encargos. O líquido consolidado do provedor é a fonte
    // contábil autoritativa e garante bruto = taxas + líquido.
    const fees = providerNet > 0 ? currency(Math.max(0, amount - providerNet)) : listedFees;
    const hash = this.receipts.hash({
      payment_id: paymentId,
      member_id: member?.id || parsed.memberId,
      amount,
      date_approved: approved,
    });
    const old = (await this.paymentRows()).find((x) => x.payment_id === paymentId);
    const record: MercadoPagoPaymentRecord = {
      id: paymentId,
      payment_id: paymentId,
      member_id: member?.id || parsed.memberId,
      member_name:
        member?.nome ||
        [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(' '),
      payer_email: email,
      external_reference: external,
      status: text(payment.status || 'unknown'),
      status_detail: text(payment.status_detail),
      amount: number(payment.transaction_amount),
      total_paid_amount:
        number(payment.transaction_details?.total_paid_amount) ||
        number(payment.transaction_amount),
      fee_amount: fees,
      net_amount: net,
      currency: text(payment.currency_id || 'BRL'),
      payment_method: text(payment.payment_method_id),
      payment_type: text(payment.payment_type_id),
      description: text(payment.description || 'Contribuição Soma+'),
      date_created: created,
      date_approved: approved,
      date_last_updated: text(payment.date_last_updated || nowIso()),
      reference_month: parsed.competence || (approved || created).slice(0, 7),
      live_mode: text(Boolean(payment.live_mode)),
      webhook_action: action,
      updated_at: nowIso(),
      card_brand: text(payment.payment_method_id),
      card_issuer: text(payment.card?.issuer?.name || payment.card?.issuer?.id),
      card_last_four: text(payment.card?.last_four_digits),
      installments: number(payment.installments),
      installment_amount: number(payment.transaction_details?.installment_amount),
      authorization_code: text(payment.authorization_code),
      transaction_id: text(payment.transaction_details?.transaction_id || payment.id),
      nsu: text(payment.authorization_code),
      pix_qr_code: text(payment.point_of_interaction?.transaction_data?.qr_code),
      pix_qr_code_base64: text(payment.point_of_interaction?.transaction_data?.qr_code_base64),
      pix_ticket_url: text(payment.point_of_interaction?.transaction_data?.ticket_url),
      pix_expiration_date: text(payment.date_of_expiration),
      paid_in_seconds:
        approved && created
          ? Math.max(0, Math.round((Date.parse(approved) - Date.parse(created)) / 1000))
          : 0,
      receipt_id: `REC-${paymentId}`,
      receipt_hash: hash,
    };
    if (!this.sheets.isDemo()) {
      if (old) await this.sheets.updateRecord('Pagamentos', 'id', paymentId, this.toRow(record));
      else await this.sheets.appendRecord('Pagamentos', this.toRow(record));
      if (
        !old ||
        old.status !== record.status ||
        old.date_last_updated !== record.date_last_updated
      )
        await this.sheets.appendRecord('HistoricoPagamentos', {
          id: randomUUID(),
          payment_id: paymentId,
          member_id: record.member_id,
          previous_status: old?.status || '',
          status: record.status,
          status_detail: record.status_detail,
          action,
          occurred_at: nowIso(),
          payload: JSON.stringify({ status: record.status, status_detail: record.status_detail }),
        });
      await this.upsertMemberContribution(record);
    }
    if (!old || old.status !== record.status) await this.notifyPayment(record);
    await this.audit(`PAYMENT_${record.status.toUpperCase()}`, paymentId, {
      member_id: record.member_id,
      amount: String(record.amount),
      status: record.status,
    });
    return true;
  }
  private async upsertMemberContribution(record: MercadoPagoPaymentRecord) {
    const rows = await this.sheets.read('ContribuicoesMembros');
    const id = `${record.member_id}|${record.reference_month}`;
    const payload = {
      id,
      member_id: record.member_id,
      member_name: record.member_name,
      reference_month: record.reference_month,
      status: record.status,
      last_payment_id: record.payment_id,
      last_payment_at: record.date_approved || record.date_created,
      amount: String(record.amount),
      payment_method: record.payment_type || record.payment_method,
      card_last_four: record.card_last_four,
      receipt_id: record.receipt_id,
      updated_at: nowIso(),
    };
    if (rows.some((x) => x.id === id))
      await this.sheets.updateRecord('ContribuicoesMembros', 'id', id, payload);
    else await this.sheets.appendRecord('ContribuicoesMembros', payload);
  }
  private async notifyPayment(record: MercadoPagoPaymentRecord) {
    if (!record.member_id) return;
    const map: Record<string, { title: string; message: string }> = {
      approved: {
        title: 'Pagamento aprovado',
        message: `Sua contribuição de ${this.money(record.amount)} foi creditada com sucesso${record.card_last_four ? ` no cartão final ${record.card_last_four}` : ''}.`,
      },
      rejected: {
        title: 'Pagamento recusado',
        message: `O Mercado Pago não aprovou a contribuição de ${this.money(record.amount)}. Consulte os detalhes e tente novamente.`,
      },
      refunded: {
        title: 'Pagamento estornado',
        message: `A contribuição de ${this.money(record.amount)} foi estornada.`,
      },
      charged_back: {
        title: 'Pagamento contestado',
        message: `A contribuição de ${this.money(record.amount)} recebeu uma contestação.`,
      },
      in_process: {
        title: 'Pagamento em análise',
        message: `Sua contribuição de ${this.money(record.amount)} está em análise.`,
      },
      pending: {
        title: 'Pagamento pendente',
        message: `Sua contribuição de ${this.money(record.amount)} aguarda confirmação.`,
      },
    };
    const item = map[record.status];
    if (item)
      await this.notifications.createSystem({
        title: item.title,
        message: item.message,
        type: 'SOMA',
        audience: 'INDIVIDUAL',
        recipientIds: [record.member_id],
        origin: 'Mercado Pago',
        referenceType: 'PAGAMENTO',
        referenceId: record.payment_id,
        link: '/soma?tab=contribuicoes',
      });
  }
  private async notifySubscription(record: MercadoPagoSubscriptionRecord, isUpdate: boolean) {
    if (!record.member_id || (!isUpdate && record.status === 'pending')) return;
    const map: Record<string, { title: string; message: string }> = {
      authorized: {
        title: 'Assinatura Soma+ ativada',
        message: `Sua contribuição mensal de ${this.money(record.amount)} foi ativada com sucesso.`,
      },
      paused: {
        title: 'Assinatura Soma+ pausada',
        message: 'Sua assinatura mensal foi pausada no Mercado Pago.',
      },
      cancelled: {
        title: 'Assinatura Soma+ cancelada',
        message: 'Sua assinatura mensal foi cancelada e não terá novas cobranças.',
      },
      pending: {
        title: 'Assinatura Soma+ pendente',
        message: 'Conclua a autorização no Mercado Pago para ativar sua contribuição mensal.',
      },
    };
    const item = map[record.status];
    if (!item) return;
    await this.notifications.createSystem({
      title: item.title,
      message: item.message,
      type: 'SOMA',
      audience: 'INDIVIDUAL',
      recipientIds: [record.member_id],
      origin: 'Mercado Pago',
      referenceType: 'ASSINATURA',
      referenceId: record.preapproval_id,
      link: '/soma?tab=contribuicoes',
    });
  }
  private validateSubscriptionCharge(
    amount: number,
    currency: string,
    subscription: MercadoPagoSubscriptionRecord,
  ) {
    if (currency !== subscription.currency)
      throw new BadRequestException('Moeda da cobrança recorrente divergente da assinatura.');
    if (Math.abs(amount - subscription.amount) > 0.009)
      throw new BadRequestException('Valor da cobrança recorrente divergente da assinatura.');
  }
  private parseExternalReference(value: string) {
    const payment = value.match(/^SOMA\|([^|]+)\|(\d{4}-\d{2})$/);
    if (payment) return { memberId: payment[1], competence: payment[2], subscription: false };
    const subscription = value.match(/^SOMA-ASSINATURA\|([^|]+)\|[0-9a-f-]+$/i);
    return {
      memberId: subscription?.[1] || '',
      competence: '',
      subscription: Boolean(subscription),
    };
  }
  private async findMemberById(id: string) {
    if (!id) return null;
    const row = (await this.memberRows()).find((x) => x.id === id);
    return row || null;
  }
  private async findMemberByEmail(email: string) {
    if (!email) return null;
    const row = (await this.memberRows()).find(
      (x) => x.email.toLowerCase() === email.toLowerCase(),
    );
    return row || null;
  }
  private async memberRows(): Promise<Member[]> {
    try {
      return (await this.members.read('Membros')).map((x) => ({
        id: text(x.id),
        nome: text(x.nome),
        email: text(x.email),
        ministerio: text(x.ministerio),
        ministerio_id: text(x.ministerio_id),
        celula: text(x.celula),
        celula_id: text(x.celula_id),
      }));
    } catch {
      return [];
    }
  }
  private async subscriptionRows(): Promise<MercadoPagoSubscriptionRecord[]> {
    if (this.sheets.isDemo()) return [...this.subscriptions];
    try {
      return (await this.sheets.read('AssinaturasSoma')).map((row) => this.rowToSubscription(row));
    } catch {
      return [];
    }
  }
  private async subscriptionRecordForUser(user: AuthenticatedUser) {
    const memberId = text(user.memberId || user.id);
    const email = text(user.email).trim().toLowerCase();
    return (await this.subscriptionRows())
      .filter(
        (item) =>
          item.member_id === memberId ||
          (Boolean(email) && item.payer_email.toLowerCase() === email),
      )
      .sort((a, b) =>
        (b.updated_at || b.last_modified || b.date_created).localeCompare(
          a.updated_at || a.last_modified || a.date_created,
        ),
      )[0];
  }
  private subscriptionStatus(status: string): SubscriptionSummary['status'] {
    const map: Record<string, SubscriptionSummary['status']> = {
      authorized: 'ACTIVE',
      pending: 'PENDING',
      paused: 'PAUSED',
      cancelled: 'CANCELLED',
    };
    return map[status.toLowerCase()] || 'INACTIVE';
  }
  private rowToSubscription(row: Record<string, string>): MercadoPagoSubscriptionRecord {
    return {
      id: text(row.id || row.preapproval_id),
      preapproval_id: text(row.preapproval_id || row.id),
      member_id: text(row.member_id),
      member_name: text(row.member_name),
      payer_email: text(row.payer_email),
      external_reference: text(row.external_reference),
      status: text(row.status).toLowerCase(),
      reason: text(row.reason),
      amount: number(row.amount),
      currency: text(row.currency || 'BRL'),
      frequency: number(row.frequency || 1),
      frequency_type: text(row.frequency_type || 'months'),
      next_payment_date: text(row.next_payment_date),
      payment_method: text(row.payment_method),
      checkout_url: text(row.checkout_url),
      back_url: text(row.back_url),
      date_created: text(row.date_created),
      last_modified: text(row.last_modified),
      webhook_action: text(row.webhook_action),
      created_at: text(row.created_at),
      updated_at: text(row.updated_at),
    };
  }
  private async paymentRows() {
    try {
      return (await this.sheets.read('Pagamentos')).map((x) => this.rowToPayment(x));
    } catch {
      try {
        return (await this.sheets.read('PagamentosMercadoPago')).map((x) => this.rowToPayment(x));
      } catch {
        return [];
      }
    }
  }
  private rowToContribution(row: Record<string, string>): Contribution {
    return {
      id: text(row.id),
      memberId: text(row.membro_id),
      memberName: text(row.membro_nome),
      email: text(row.email),
      amount: number(row.valor),
      date: text(row.data),
      referenceMonth: text(row.competencia || (row.data || '').slice(0, 7)),
      method: text(row.forma_pagamento),
      status: (['PENDING', 'CONFIRMED', 'CANCELLED'].includes(row.status)
        ? row.status
        : 'PENDING') as Contribution['status'],
      receiptUrl: text(row.comprovante_url || row.comprovante),
      notes: text(row.observacao),
    };
  }
  private rowToPayment(row: Record<string, string>): MercadoPagoPaymentRecord {
    const amount = currency(row.amount);
    const storedFees = currency(row.fee_amount);
    const hasStoredNet = text(row.net_amount) !== '';
    const net = hasStoredNet
      ? currency(row.net_amount)
      : currency(Math.max(0, amount - storedFees));
    const fees = hasStoredNet ? currency(Math.max(0, amount - net)) : storedFees;
    return {
      id: text(row.id || row.payment_id),
      payment_id: text(row.payment_id || row.id),
      member_id: text(row.member_id),
      member_name: text(row.member_name),
      payer_email: text(row.payer_email),
      external_reference: text(row.external_reference),
      status: text(row.status),
      status_detail: text(row.status_detail),
      amount,
      total_paid_amount: number(row.total_paid_amount || row.amount),
      fee_amount: fees,
      net_amount: net,
      currency: text(row.currency || 'BRL'),
      payment_method: text(row.payment_method),
      payment_type: text(row.payment_type),
      description: text(row.description),
      date_created: text(row.date_created),
      date_approved: text(row.date_approved),
      date_last_updated: text(row.date_last_updated),
      reference_month: text(row.reference_month),
      live_mode: text(row.live_mode),
      webhook_action: text(row.webhook_action),
      updated_at: text(row.updated_at),
      card_brand: text(row.card_brand),
      card_issuer: text(row.card_issuer),
      card_last_four: text(row.card_last_four),
      installments: number(row.installments),
      installment_amount: number(row.installment_amount),
      authorization_code: text(row.authorization_code),
      transaction_id: text(row.transaction_id),
      nsu: text(row.nsu),
      pix_qr_code: text(row.pix_qr_code),
      pix_qr_code_base64: text(row.pix_qr_code_base64),
      pix_ticket_url: text(row.pix_ticket_url),
      pix_expiration_date: text(row.pix_expiration_date),
      paid_in_seconds: number(row.paid_in_seconds),
      receipt_id: text(row.receipt_id),
      receipt_hash: text(row.receipt_hash),
    };
  }
  private toRow<T extends object>(record: T) {
    return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, text(v)]));
  }
  private async saveWebhookLog(args: {
    resourceId: string;
    type: string;
    action: string;
    status: string;
    error: string;
    input: WebhookInput;
    processingTime: number;
  }) {
    if (this.sheets.isDemo()) return;
    await this.sheets.appendRecord('WebhookLogs', {
      id: randomUUID(),
      resource_id: args.resourceId,
      type: args.type,
      action: args.action,
      received_at: nowIso(),
      request_id: text(args.input.requestId),
      signature: '',
      ip: '',
      processing_time_ms: String(args.processingTime),
      status: args.status,
      retry: '0',
      error: args.error.slice(0, 500),
      payload: JSON.stringify({
        resourceId: args.resourceId,
        type: args.type,
        action: args.action,
      }),
      headers: '',
    });
  }
  private async audit(event: string, reference: string, data: Record<string, string>) {
    if (this.sheets.isDemo()) return;
    try {
      await this.sheets.appendRecord('AuditoriaFinanceira', {
        id: randomUUID(),
        event,
        reference,
        data: JSON.stringify(data),
        created_at: nowIso(),
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria financeira ${event}/${reference}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  async receipt(paymentId: string, user: AuthenticatedUser) {
    const payment = (await this.paymentRows()).find((x) => x.payment_id === paymentId);
    if (!payment) throw new NotFoundException('Pagamento não encontrado.');
    if (!ADMIN_ROLES.includes(user.profile) && payment.member_id !== (user.memberId || user.id))
      throw new ForbiddenException('Recibo indisponível para este usuário.');
    const apiUrl = text(this.config.get('PUBLIC_API_URL') || '').replace(/\/$/, '');
    return this.receipts.pdf(
      payment,
      `${apiUrl}/api/soma/receipts/${payment.payment_id}/validate?hash=${payment.receipt_hash}`,
    );
  }
  async validateReceipt(paymentId: string, hash: string) {
    const payment = (await this.paymentRows()).find((x) => x.payment_id === paymentId);
    return {
      valid: !!payment && payment.receipt_hash === hash && payment.status === 'approved',
      payment: payment
        ? {
            paymentId: payment.payment_id,
            memberName: payment.member_name,
            amount: payment.amount,
            date: payment.date_approved,
            status: payment.status,
          }
        : null,
    };
  }
  async exportReport(
    user: AuthenticatedUser,
    format: 'csv' | 'xls',
    filter: { from?: string; to?: string },
  ) {
    const report = await this.financialReport(user, filter);
    const headers = [
      'ID',
      'Membro',
      'E-mail',
      'Status',
      'Valor bruto',
      'Taxas',
      'Valor líquido',
      'Forma',
      'Cartão final',
      'Parcelas',
      'Data',
    ];
    const lines = [
      headers,
      ...report.payments.map((x) => [
        x.payment_id,
        x.member_name,
        x.payer_email,
        x.status,
        x.amount,
        x.fee_amount,
        x.net_amount,
        x.payment_type || x.payment_method,
        x.card_last_four,
        x.installments,
        x.date_approved || x.date_created,
      ]),
    ];
    const sep = format === 'csv' ? ';' : '\t';
    return Buffer.from('\ufeff' + lines.map((row) => row.map(escapeCsvCell).join(sep)).join('\n'));
  }
  async reconcilePreviousDay() {
    const token = text(this.config.get('MERCADO_PAGO_ACCESS_TOKEN'));
    if (!token || this.sheets.isDemo()) return { checked: 0, updated: 0 };
    const end = new Date(),
      begin = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const query = new URLSearchParams({
      range: 'date_created',
      begin_date: begin.toISOString(),
      end_date: end.toISOString(),
      limit: '100',
    });
    const result = await this.mpRequest<{ results?: MercadoPagoPayment[] }>(
      `/v1/payments/search?${query}`,
    );
    let updated = 0;
    for (const payment of result.results || []) {
      if (await this.savePayment(payment, 'reconciliation.daily')) updated++;
    }
    const subscriptions = (await this.subscriptionRows()).filter((item) =>
      ['pending', 'authorized', 'paused'].includes(item.status),
    );
    let subscriptionsUpdated = 0;
    for (const subscription of subscriptions) {
      const remote = await this.fetchSubscription(subscription.preapproval_id);
      await this.saveSubscription(remote, 'reconciliation.daily');
      subscriptionsUpdated++;
    }
    await this.sheets.appendRecord('FinanceiroMensal', {
      id: nowIso(),
      month: new Date().toISOString().slice(0, 7),
      checked: String(result.results?.length || 0),
      updated: String(updated),
      subscriptions_checked: String(subscriptions.length),
      subscriptions_updated: String(subscriptionsUpdated),
      executed_at: nowIso(),
    });
    return {
      checked: result.results?.length || 0,
      updated,
      subscriptionsChecked: subscriptions.length,
      subscriptionsUpdated,
    };
  }
  private async mpRequest<T>(
    path: string,
    init: RequestInit = {},
    { ...extraHeaders }: Record<string, string> = {},
  ) {
    const token = text(this.config.get('MERCADO_PAGO_ACCESS_TOKEN')).trim();
    if (!token) throw new UnauthorizedException('MERCADO_PAGO_ACCESS_TOKEN não configurado.');
    const configuredTimeout = Number(this.config.get('MERCADO_PAGO_API_TIMEOUT_MS') || 10000);
    const timeout = Math.min(
      30000,
      Math.max(1000, Number.isFinite(configuredTimeout) ? configuredTimeout : 10000),
    );
    let response: Response;
    try {
      response = await fetch(`https://api.mercadopago.com${path}`, {
        ...init,
        signal: init.signal || AbortSignal.timeout(timeout),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...extraHeaders,
          ...(init.headers || {}),
        },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.name : '';
      if (reason === 'AbortError' || reason === 'TimeoutError')
        throw new BadRequestException('O Mercado Pago não respondeu dentro do tempo esperado.');
      throw new BadRequestException('Não foi possível conectar ao Mercado Pago.');
    }
    if (!response.ok)
      throw new BadRequestException(`O Mercado Pago recusou a operação (HTTP ${response.status}).`);
    return (await response.json()) as T;
  }
  private money(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
}
