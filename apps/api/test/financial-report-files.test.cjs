const assert = require('node:assert/strict');
const test = require('node:test');
const { GoogleDriveService } = require('../dist/google-drive/google-drive.service');

const users = {
  developer: { id: 'dev', memberId: 'dev', uid: 'dev', profile: 'DEVELOPER', ministry: '' },
  mission: { id: 'mission', memberId: 'mission', uid: 'mission', profile: 'MISSION_LEADER', ministry: '' },
  financial: { id: 'finance', memberId: 'finance', uid: 'finance', profile: 'MINISTRY_LEADER', ministry: 'Financeiro' },
  other: { id: 'events', memberId: 'events', uid: 'events', profile: 'MINISTRY_LEADER', ministry: 'Eventos' },
  member: { id: 'member', memberId: 'member', uid: 'member', profile: 'MEMBER', ministry: 'Financeiro' },
};

function fixture() {
  const report = { id: 'report-1', category: 'REPORT', referenceId: 'financeiro', createdAt: '2026-09-13T10:00:00Z', deleted: false };
  const files = {
    list: async (category) => category === 'REPORT' ? [report] : [report, { id: 'other' }],
  };
  const sheets = {
    read: async (tab) => tab === 'Ministérios' ? [
      { id: 'finance-ministry', nome: 'Financeiro', codigo: 'FINANCAS', lider_id: 'finance', ativo: 'TRUE' },
      { id: 'events-ministry', nome: 'Eventos', lider_id: 'events', ativo: 'TRUE' },
    ] : [],
    parseActive: (value, fallback = false) => value === '' ? fallback : String(value).toUpperCase() === 'TRUE',
  };
  return new GoogleDriveService({}, files, {}, {}, sheets);
}

test('planilhas financeiras ficam disponíveis somente aos perfis autorizados', async () => {
  for (const user of [users.developer, users.mission, users.financial]) {
    const result = await fixture().listFinancialReports(user);
    assert.deepEqual(result.map((item) => item.id), ['report-1']);
  }
  for (const user of [users.other, users.member])
    await assert.rejects(() => fixture().listFinancialReports(user), /Acesso restrito/i);
});
