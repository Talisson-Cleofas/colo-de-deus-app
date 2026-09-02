const test = require('node:test');
const assert = require('node:assert/strict');
const { AdminDashboardService } = require('../dist/admin/admin-dashboard.service');
const { AdminDashboardController } = require('../dist/admin/admin-dashboard.controller');
const { SomaService } = require('../dist/soma/soma.service');

function fixture() {
  const soma = Object.create(SomaService.prototype);
  const payments = [
    ['approved', 25.10, '2026-09-01'],
    ['approved', 10.20, '2026-09-02'],
    ['pending', 100, '2026-09-02'],
    ['rejected', 100, '2026-09-02'],
    ['refunded', 100, '2026-09-02'],
    ['charged_back', 100, '2026-09-02'],
    ['approved', 50, '2026-08-31'],
  ].map(([status, amount, date]) => ({
    status, amount, date_approved: status === 'approved' ? date : '',
    date_created: status === 'approved' ? '2026-08-01' : date, reference_month: '2026-08',
    member_id: 'member-test', fee_amount: 0, net_amount: amount,
  }));
  soma.paymentRows = async () => payments;
  soma.memberRows = async () => [];
  soma.settings = async () => ({ goal: 1000 });
  const sheets = {
    isDemo: () => false, listMembers: async () => [], read: async () => [],
    parseActive: () => true,
  };
  return { dashboard: new AdminDashboardService(sheets, soma), payments, soma };
}

test('dashboard uses Soma confirmed payments and approval month, not reference month', async () => {
  const { dashboard, soma } = fixture();
  const result = await dashboard.getDashboard('2026-09');
  assert.equal(result.month, '2026-09');
  assert.equal(result.metrics.somaThisMonth, 35.30);
  assert.equal(result.metrics.somaThisMonth, (await soma.summary('2026-09')).total);
  assert.equal((await dashboard.getDashboard('2026-08')).metrics.somaThisMonth, 50);
  assert.equal((await dashboard.getDashboard('2026-10')).metrics.somaThisMonth, 0);
});

test('dashboard reflects newly approved payments on the next request', async () => {
  const { dashboard, payments } = fixture();
  await dashboard.getDashboard('2026-09');
  payments[2].status = 'approved';
  payments[2].date_approved = '2026-09-03';
  assert.equal((await dashboard.getDashboard('2026-09')).metrics.somaThisMonth, 135.30);
});

test('controller forwards month; invalid months are rejected', async () => {
  const { dashboard } = fixture();
  const controller = new AdminDashboardController(dashboard, {});
  assert.equal((await controller.getDashboard('2026-09')).metrics.somaThisMonth, 35.30);
  await assert.rejects(dashboard.getDashboard('2026-13'), /Mês inválido/);
});
