const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { validateEnvironment } = require('../dist/config/env.validation');
const { escapeCsvCell, neutralizeSpreadsheetFormula } = require('../dist/common/spreadsheet-cell');
const { memberProfileAccess } = require('../dist/members/member-profile.policy');
const { SomaService } = require('../dist/soma/soma.service');

test('bloqueia modo demo e webhook sem assinatura fora de ambiente seguro', () => {
  assert.throws(
    () => validateEnvironment({ NODE_ENV: 'production', DEMO_MODE: 'true' }),
    /DEMO_MODE=true é proibido/,
  );

  assert.throws(
    () =>
      validateEnvironment({
        NODE_ENV: 'development',
        DEMO_MODE: 'false',
        MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS: 'true',
        FIREBASE_PROJECT_ID: 'project',
        FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
        FIREBASE_PRIVATE_KEY: 'key',
        GOOGLE_SHEETS_ID: 'sheet',
        GOOGLE_SERVICE_ACCOUNT_EMAIL: 'sheets@example.com',
        GOOGLE_PRIVATE_KEY: 'key',
      }),
    /Webhooks sem assinatura|deve permanecer false/,
  );
});

test('aceita um ambiente demo explicitamente isolado em desenvolvimento', () => {
  const environment = validateEnvironment({
    NODE_ENV: 'development',
    DEMO_MODE: 'true',
    MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS: 'true',
  });
  assert.equal(environment.DEMO_MODE, 'true');
  assert.equal(environment.SWAGGER_ENABLED, 'true');
});

test('neutraliza fórmulas em células exportadas para planilhas', () => {
  for (const unsafe of ['=1+1', '+cmd', '-2+3', '@SUM(A1:A2)', '  =HYPERLINK("x")']) {
    assert.match(neutralizeSpreadsheetFormula(unsafe), /^\s*'/);
    assert.match(escapeCsvCell(unsafe), /^"/);
  }
  assert.equal(neutralizeSpreadsheetFormula('Membro seguro'), 'Membro seguro');
});

test('limita dados financeiros e históricos ao próprio membro ou administração central', () => {
  const member = { id: 'member-2', active: true, ministry: 'Acolhida', cell: 'Célula 1' };
  const leader = {
    uid: 'leader',
    id: 'leader',
    memberId: 'leader',
    profile: 'MINISTRY_LEADER',
    ministry: 'Acolhida',
    cell: '',
  };
  const leaderAccess = memberProfileAccess(leader, member);
  assert.equal(leaderAccess.canViewCareData, true);
  assert.equal(leaderAccess.canViewFinancial, false);
  assert.equal(leaderAccess.canViewHistory, false);

  const selfAccess = memberProfileAccess(
    { ...leader, id: 'member-2', memberId: 'member-2', profile: 'MEMBER' },
    member,
  );
  assert.equal(selfAccess.canViewFinancial, true);
  assert.equal(selfAccess.canViewHistory, true);
});

test('persiste, autentica e deduplica jobs de webhook sem registrar segredos', async () => {
  const tabs = new Map();
  const sheets = {
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
  const queue = {
    promise: Promise.resolve(),
    enqueue(_key, run) {
      this.promise = run();
      return true;
    },
    size: () => 1,
  };
  const secret = 'webhook-test-secret';
  const service = new SomaService(
    new ConfigService({
      MERCADO_PAGO_WEBHOOK_SECRET: secret,
      MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS: '900',
      MERCADO_PAGO_WEBHOOK_MAX_ATTEMPTS: '5',
    }),
    sheets,
    { read: async () => [] },
    {},
    queue,
    {},
  );
  const dataId = 'merchant-order-42';
  const requestId = 'request-42';
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  const input = {
    body: { type: 'merchant_order', action: 'merchant_order.updated', data: { id: dataId } },
    signature: `ts=${ts},v1=${v1}`,
    requestId,
  };

  const accepted = await service.receiveMercadoPagoWebhook(input);
  assert.equal(accepted.queued, true);
  await queue.promise;
  assert.equal(tabs.get('WebhookJobs')[0].status, 'PROCESSED');
  assert.equal(tabs.get('WebhookLogs')[0].signature, '');
  assert.equal(tabs.get('WebhookLogs')[0].headers, '');

  const duplicate = await service.receiveMercadoPagoWebhook(input);
  assert.equal(duplicate.duplicate, true);
  assert.equal(tabs.get('WebhookLogs').length, 1);
});

test('rejeita assinatura de webhook expirada', async () => {
  const secret = 'webhook-test-secret';
  const dataId = '42';
  const requestId = 'request-old';
  const ts = String(Math.floor(Date.now() / 1000) - 3600);
  const v1 = createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  const service = new SomaService(
    new ConfigService({
      MERCADO_PAGO_WEBHOOK_SECRET: secret,
      MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS: '60',
    }),
    {},
    {},
    {},
    {},
    {},
  );
  await assert.rejects(
    service.receiveMercadoPagoWebhook({
      body: { type: 'payment', data: { id: dataId } },
      signature: `ts=${ts},v1=${v1}`,
      requestId,
    }),
    /expirada/,
  );
});
