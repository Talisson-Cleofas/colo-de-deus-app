const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { SomaService } = require('../dist/soma/soma.service');

function memorySheets(seed = {}) {
  const tabs = new Map(Object.entries(seed).map(([tab, rows]) => [tab, [...rows]]));
  return {
    tabs,
    isDemo: () => false,
    read: async (tab) => [...(tabs.get(tab) || [])],
    appendRecord: async (tab, record) => tabs.set(tab, [...(tabs.get(tab) || []), record]),
    updateRecord: async (tab, idHeader, idValue, record) =>
      tabs.set(
        tab,
        (tabs.get(tab) || []).map((item) =>
          item[idHeader] === idValue ? { ...item, ...record } : item,
        ),
      ),
  };
}

function fixture() {
  const sheets = memorySheets();
  const notifications = [];
  const queue = {
    promise: Promise.resolve(),
    enqueue(_key, run) {
      this.promise = run();
      return true;
    },
    size: () => 1,
  };
  const member = {
    id: 'member-1',
    nome: 'Membro Teste',
    email: 'membro@example.com',
    ministerio: 'Finanças',
  };
  const service = new SomaService(
    new ConfigService({
      MERCADO_PAGO_ACCESS_TOKEN: 'test-token',
      MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret',
      MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS: '900',
      MERCADO_PAGO_WEBHOOK_MAX_ATTEMPTS: '5',
      FRONTEND_URL: 'https://app.example.com',
      PUBLIC_API_URL: 'https://api.example.com',
    }),
    sheets,
    { read: async () => [member] },
    { createSystem: async (notification) => notifications.push(notification) },
    queue,
    { hash: () => 'receipt-hash' },
  );
  const user = {
    uid: 'firebase-1',
    id: 'member-1',
    memberId: 'member-1',
    name: 'Membro Teste',
    email: 'membro@example.com',
    profile: 'MEMBER',
  };
  return { service, sheets, notifications, queue, member, user };
}

function signedInput({ dataId, type, action, requestId }) {
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', 'webhook-secret')
    .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  return {
    body: { type, action, data: { id: dataId } },
    signature: `ts=${ts},v1=${signature}`,
    requestId,
  };
}

test('relatório pessoal limita o membro e reconcilia taxa com o líquido do provedor', async () => {
  const { service, sheets, user } = fixture();
  sheets.tabs.set('Pagamentos', [
    {
      id: 'payment-1', payment_id: 'payment-1', member_id: 'member-1', member_name: 'Membro Teste',
      payer_email: 'membro@example.com', status: 'approved', amount: '5', fee_amount: '0.12',
      net_amount: '4.76', date_created: '2026-08-17T12:00:00.000Z',
      date_approved: '2026-08-17T12:00:05.000Z', reference_month: '2026-08',
    },
    {
      id: 'payment-2', payment_id: 'payment-2', member_id: 'member-2', member_name: 'Outro Membro',
      payer_email: 'outro@example.com', status: 'approved', amount: '100', fee_amount: '5',
      net_amount: '95', date_created: '2026-08-17T12:00:00.000Z',
      date_approved: '2026-08-17T12:00:05.000Z', reference_month: '2026-08',
    },
  ]);
  const report = await service.personalFinancialReport(user, { from: '2026-01-01', to: '2026-12-31' });
  assert.equal(report.payments.length, 1);
  assert.equal(report.payments[0].payment_id, 'payment-1');
  assert.equal(report.totals.gross, 5);
  assert.equal(report.totals.fees, 0.24);
  assert.equal(report.totals.net, 4.76);
  assert.equal(report.totals.gross, report.totals.fees + report.totals.net);
  await assert.rejects(service.personalFinancialReport({ ...user, profile: 'ADMIN' }), /centro financeiro/);
});

test('cria assinatura pendente individual e não duplica o checkout', async () => {
  const { service, sheets, user } = fixture();
  const calls = [];
  service.mpRequest = async (path, init, headers) => {
    calls.push({ path, init, headers });
    const body = JSON.parse(init.body);
    return {
      id: 'preapproval-1',
      init_point: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=1',
      status: 'pending',
      external_reference: body.external_reference,
      payer_email: body.payer_email,
      reason: body.reason,
      back_url: body.back_url,
      auto_recurring: body.auto_recurring,
      date_created: '2026-08-09T12:00:00.000Z',
    };
  };

  const result = await service.createSubscription({ amount: 50 }, user);
  assert.equal(result.subscriptionId, 'preapproval-1');
  assert.equal(result.amount, 50);
  assert.match(result.externalReference, /^SOMA-ASSINATURA\|member-1\|/);
  assert.equal(calls[0].path, '/preapproval');
  assert.equal(calls[0].init.method, 'POST');
  assert.ok(calls[0].headers['X-Idempotency-Key']);
  const request = JSON.parse(calls[0].init.body);
  assert.equal(request.status, 'pending');
  assert.equal(request.payer_email, 'membro@example.com');
  assert.equal(request.auto_recurring.transaction_amount, 50);
  assert.equal(request.auto_recurring.currency_id, 'BRL');
  assert.equal(
    request.back_url,
    'https://app.example.com/soma?subscription=return&tab=contribuicoes',
  );
  assert.equal(Object.hasOwn(request, 'notification_url'), false);
  assert.equal(sheets.tabs.get('AssinaturasSoma').length, 1);

  const repeated = await service.createSubscription({ amount: 50 }, user);
  assert.equal(repeated.subscriptionId, 'preapproval-1');
  assert.equal(calls.length, 1);
  assert.equal((await service.subscription(user)).status, 'PENDING');
});

test('atualiza e cancela somente a assinatura vinculada ao usuário autenticado', async () => {
  const { service, sheets, notifications, user } = fixture();
  sheets.tabs.set('AssinaturasSoma', [
    {
      id: 'preapproval-1',
      preapproval_id: 'preapproval-1',
      member_id: 'member-1',
      member_name: 'Membro Teste',
      payer_email: 'membro@example.com',
      external_reference: 'SOMA-ASSINATURA|member-1|11111111-1111-4111-8111-111111111111',
      status: 'authorized',
      reason: 'Soma+',
      amount: '50',
      currency: 'BRL',
      frequency: '1',
      frequency_type: 'months',
      created_at: '2026-08-09T12:00:00.000Z',
      updated_at: '2026-08-09T12:00:00.000Z',
    },
  ]);
  const calls = [];
  service.mpRequest = async (path, init) => {
    calls.push({ path, init });
    return {
      id: 'preapproval-1',
      status: 'cancelled',
      external_reference: 'SOMA-ASSINATURA|member-1|11111111-1111-4111-8111-111111111111',
      payer_email: 'membro@example.com',
      reason: 'Soma+',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 50,
        currency_id: 'BRL',
      },
    };
  };

  const summary = await service.cancelSubscription(user);
  assert.equal(summary.status, 'CANCELLED');
  assert.equal(calls[0].path, '/preapproval/preapproval-1');
  assert.deepEqual(JSON.parse(calls[0].init.body), { status: 'cancelled' });
  assert.equal(sheets.tabs.get('AssinaturasSoma')[0].status, 'cancelled');
  assert.equal(notifications.at(-1).referenceType, 'ASSINATURA');
});

test('processa e deduplica eventos de assinatura, fatura recorrente e pagamento', async () => {
  const { service, sheets, notifications, queue, user } = fixture();
  sheets.tabs.set('AssinaturasSoma', [
    {
      id: 'preapproval-1',
      preapproval_id: 'preapproval-1',
      member_id: 'member-1',
      member_name: 'Membro Teste',
      payer_email: 'membro@example.com',
      external_reference: 'SOMA-ASSINATURA|member-1|11111111-1111-4111-8111-111111111111',
      status: 'pending',
      reason: 'Soma+',
      amount: '50',
      currency: 'BRL',
      frequency: '1',
      frequency_type: 'months',
      created_at: '2026-08-09T12:00:00.000Z',
      updated_at: '2026-08-09T12:00:00.000Z',
    },
  ]);
  service.mpRequest = async (path) => {
    if (path === '/preapproval/preapproval-1')
      return {
        id: 'preapproval-1',
        status: 'authorized',
        external_reference: 'SOMA-ASSINATURA|member-1|11111111-1111-4111-8111-111111111111',
        payer_email: 'membro@example.com',
        reason: 'Soma+',
        next_payment_date: '2026-09-09T12:00:00.000Z',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 50,
          currency_id: 'BRL',
        },
      };
    if (path === '/authorized_payments/invoice-1')
      return {
        id: 'invoice-1',
        preapproval_id: 'preapproval-1',
        external_reference: 'SOMA-ASSINATURA|member-1|11111111-1111-4111-8111-111111111111',
        status: 'processed',
        transaction_amount: 50,
        currency_id: 'BRL',
        debit_date: '2026-08-09T12:00:00.000Z',
        payment: { id: '777', status: 'approved' },
      };
    if (path === '/v1/payments/777')
      return {
        id: '777',
        status: 'approved',
        transaction_amount: 50,
        currency_id: 'BRL',
        payment_method_id: 'visa',
        payment_type_id: 'credit_card',
        external_reference: 'SOMA-ASSINATURA|member-1|11111111-1111-4111-8111-111111111111',
        payer: { email: 'membro@example.com', first_name: 'Membro', last_name: 'Teste' },
        date_created: '2026-08-09T12:00:00.000Z',
        date_approved: '2026-08-09T12:00:05.000Z',
        date_last_updated: '2026-08-09T12:00:05.000Z',
        transaction_details: { net_received_amount: 48, total_paid_amount: 50 },
        card: { last_four_digits: '1234' },
      };
    throw new Error(`Caminho inesperado: ${path}`);
  };

  const subscriptionEvent = signedInput({
    dataId: 'preapproval-1',
    type: 'subscription_preapproval',
    action: 'subscription_preapproval.updated',
    requestId: 'request-subscription-1',
  });
  await service.receiveMercadoPagoWebhook(subscriptionEvent);
  await queue.promise;
  assert.equal(sheets.tabs.get('AssinaturasSoma')[0].status, 'authorized');
  assert.equal((await service.subscription(user)).status, 'ACTIVE');

  const duplicate = await service.receiveMercadoPagoWebhook(subscriptionEvent);
  assert.equal(duplicate.duplicate, true);
  assert.equal(notifications.filter((item) => item.referenceType === 'ASSINATURA').length, 1);

  const invoiceEvent = signedInput({
    dataId: 'invoice-1',
    type: 'subscription_authorized_payment',
    action: 'subscription_authorized_payment.updated',
    requestId: 'request-invoice-1',
  });
  await service.receiveMercadoPagoWebhook(invoiceEvent);
  await queue.promise;
  assert.equal(sheets.tabs.get('CobrancasAssinaturas').length, 1);
  assert.equal(sheets.tabs.get('Pagamentos').length, 1);
  assert.equal(sheets.tabs.get('Pagamentos')[0].member_id, 'member-1');
  assert.equal(sheets.tabs.get('Pagamentos')[0].status, 'approved');
  assert.equal(sheets.tabs.get('HistoricoPagamentos').length, 1);

  const repeatedInvoice = await service.receiveMercadoPagoWebhook(invoiceEvent);
  assert.equal(repeatedInvoice.duplicate, true);
  assert.equal(sheets.tabs.get('CobrancasAssinaturas').length, 1);
  assert.equal(sheets.tabs.get('Pagamentos').length, 1);
  assert.equal(sheets.tabs.get('HistoricoPagamentos').length, 1);
});

test('rejeita cobrança recorrente com valor divergente e mantém job recuperável', async () => {
  const { service, sheets, queue } = fixture();
  sheets.tabs.set('AssinaturasSoma', [
    {
      id: 'preapproval-1',
      preapproval_id: 'preapproval-1',
      member_id: 'member-1',
      member_name: 'Membro Teste',
      payer_email: 'membro@example.com',
      external_reference: 'SOMA-ASSINATURA|member-1|11111111-1111-4111-8111-111111111111',
      status: 'authorized',
      reason: 'Soma+',
      amount: '50',
      currency: 'BRL',
      frequency: '1',
      frequency_type: 'months',
      created_at: '2026-08-09T12:00:00.000Z',
      updated_at: '2026-08-09T12:00:00.000Z',
    },
  ]);
  service.mpRequest = async (path) => {
    if (path === '/authorized_payments/invoice-invalid')
      return {
        id: 'invoice-invalid',
        preapproval_id: 'preapproval-1',
        status: 'processed',
        transaction_amount: 99,
        currency_id: 'BRL',
        payment: { id: '999', status: 'approved' },
      };
    throw new Error(`Não deveria consultar ${path}`);
  };
  const event = signedInput({
    dataId: 'invoice-invalid',
    type: 'subscription_authorized_payment',
    action: 'subscription_authorized_payment.updated',
    requestId: 'request-invoice-invalid',
  });

  await service.receiveMercadoPagoWebhook(event);
  await assert.rejects(queue.promise, /Valor da cobrança recorrente divergente/);
  assert.equal(sheets.tabs.get('WebhookJobs')[0].status, 'RETRY');
  assert.equal(sheets.tabs.get('WebhookJobs')[0].attempts, '1');
  assert.equal((sheets.tabs.get('CobrancasAssinaturas') || []).length, 0);
  assert.equal((sheets.tabs.get('Pagamentos') || []).length, 0);
});
